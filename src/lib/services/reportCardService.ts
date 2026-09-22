import mongoose from "mongoose";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import Student from "@/models/Student";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import School from "@/models/School";
import Attendance from "@/models/Attendance";
import { ResultCalculationService, SubjectResultInput } from "./resultCalculationService";

export interface ReportCardData {
  school: {
    id: string;
    name: string;
    logo?: string;
    tagline?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber?: string;
    photo?: string;
    gender?: string;
    dob?: string;
    fatherName?: string;
    motherName?: string;
    class: { id: string; name: string; code?: string };
    section: { id: string; name: string };
  };
  exam: {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    academicYear: { id: string; name: string };
    status: string;
  };
  academic: {
    totalObtainedMarks: number;
    totalMaximumMarks: number;
    percentage: number;
    overallGrade: string;
    isPassed: boolean;
    statusText: "PASSED" | "FAILED" | "INCOMPLETE";
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      marks: number | null;
      maximumMarks: number;
      passingMarks: number;
      percentage: number | null;
      grade: string;
      isPassed: boolean;
      remarks?: string;
    }>;
  };
  attendance: {
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    leave: number;
    attendancePercentage: number;
  };
  gradingScales: Array<{
    grade: string;
    minPercentage: number;
    maxPercentage: number;
    description?: string;
  }>;
  resultStatus: "DRAFT" | "REVIEWED" | "PUBLISHED";
  generatedAt: string;
}

export class ReportCardService {
  public static async generateReportCard(params: {
    schoolId: string | mongoose.Types.ObjectId;
    examId: string | mongoose.Types.ObjectId;
    studentId: string | mongoose.Types.ObjectId;
  }): Promise<ReportCardData | null> {
    const { schoolId, examId, studentId } = params;

    const [school, exam, student] = await Promise.all([
      School.findById(schoolId).lean(),
      Exam.findOne({ _id: examId, schoolId, isActive: true })
        .populate("academicYearId", "name startDate endDate")
        .lean(),
      Student.findOne({ _id: studentId, schoolId })
        .populate("userId", "name email profileImage")
        .populate("classId", "name code")
        .populate("sectionId", "name")
        .lean(),
    ]);

    if (!school || !exam || !student) {
      return null;
    }

    // 1. Fetch Exam Subjects for this exam & student's class
    // We look up historical results first to ensure we use historical class & section
    const results = await ExamResult.find({
      schoolId,
      examId,
      studentId,
    })
      .populate("subjectId", "name code")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();

    // Determine historical class and section from results or student profile
    const historicalClassId = results.length > 0 && results[0].classId
      ? results[0].classId
      : student.classId;

    const historicalSectionId = results.length > 0 && results[0].sectionId
      ? results[0].sectionId
      : student.sectionId;

    const targetClassId = (historicalClassId as any)?._id || historicalClassId;

    // Fetch configured exam subjects for this class
    const examSubjects = await ExamSubject.find({
      schoolId,
      examId,
      classId: targetClassId,
      isActive: true,
    })
      .populate("subjectId", "name code")
      .lean();

    // Create lookup map for existing results
    const resultsBySubjectMap = new Map<string, any>();
    let overallResultStatus: "DRAFT" | "REVIEWED" | "PUBLISHED" = "DRAFT";
    let reviewedCount = 0;
    let publishedCount = 0;

    for (const r of results) {
      const subId = r.subjectId ? (r.subjectId as any)._id?.toString() || r.subjectId.toString() : "";
      if (subId) {
        resultsBySubjectMap.set(subId, r);
      }
      if (r.status === "REVIEWED") reviewedCount++;
      if (r.status === "PUBLISHED") publishedCount++;
    }

    if (publishedCount > 0 && publishedCount === results.length) {
      overallResultStatus = "PUBLISHED";
    } else if (reviewedCount > 0) {
      overallResultStatus = "REVIEWED";
    }

    // Prepare inputs for ResultCalculationService
    const gradingScales = school.gradingSettings?.scales && school.gradingSettings.scales.length > 0
      ? school.gradingSettings.scales
      : undefined;

    const subjectInputs: SubjectResultInput[] = examSubjects.map((es: any) => {
      const subId = es.subjectId?._id?.toString() || es.subjectId?.toString() || "";
      const matchedResult = resultsBySubjectMap.get(subId);

      return {
        subjectId: subId,
        subjectName: es.subjectId?.name || "Subject",
        subjectCode: es.subjectId?.code || "",
        marks: matchedResult && matchedResult.marks !== null && matchedResult.marks !== undefined
          ? matchedResult.marks
          : null,
        maximumMarks: es.maximumMarks,
        passingMarks: es.passingMarks,
      };
    });

    const evaluatedAcademic = ResultCalculationService.calculateOverallResult(
      subjectInputs,
      gradingScales
    );

    // Merge remarks into evaluated academic subjects
    const subjectsWithRemarks = evaluatedAcademic.subjects.map((sub) => {
      const matchedResult = resultsBySubjectMap.get(sub.subjectId);
      return {
        ...sub,
        subjectName: sub.subjectName || "Subject",
        subjectCode: sub.subjectCode || "",
        remarks: matchedResult?.remarks || "",
      };
    });

    // 2. Fetch Attendance Statistics from A4 module
    const attendanceRecords = await Attendance.find({
      schoolId,
      studentId,
      academicYearId: exam.academicYearId ? (exam.academicYearId as any)._id || exam.academicYearId : undefined,
    }).lean();

    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let leave = 0;

    for (const att of attendanceRecords) {
      const st = (att.status as string) || "";
      if (st === "PRESENT") present++;
      else if (st === "ABSENT") absent++;
      else if (st === "LATE") late++;
      else if (st === "HALF_DAY") halfDay++;
      else if (st === "LEAVE") leave++;
    }

    const totalSessions = attendanceRecords.length;
    const effectivePresent = present + late + (halfDay * 0.5);
    const attendancePercentage = totalSessions > 0
      ? Math.round(((effectivePresent / totalSessions) * 100) * 10) / 10
      : 100;

    // 3. Assemble Full Report Card DTO
    const studentUser = (student as any).userId;
    const studentName = `${student.firstName} ${student.lastName}`.trim() || (studentUser?.name ?? "Student");

    // Resolved historical class & section names
    const resolvedClassName = (historicalClassId as any)?.name || (student.classId as any)?.name || "Class";
    const resolvedClassCode = (historicalClassId as any)?.code || (student.classId as any)?.code || "";
    const resolvedSectionName = (historicalSectionId as any)?.name || (student.sectionId as any)?.name || "A";

    return {
      school: {
        id: school._id.toString(),
        name: school.name,
        logo: school.branding?.logo || school.logo || "",
        tagline: (school.branding as any)?.tagline || "",
        address: typeof school.address === "string" ? school.address : (school.address as any)?.street || "",
        city: school.city || (school.address as any)?.city || "",
        state: school.state || (school.address as any)?.state || "",
        pincode: (school.address as any)?.postalCode || (school.address as any)?.zipCode || "",
        phone: school.phone || "",
        email: school.email || "",
        website: school.website || "",
      },
      student: {
        id: student._id.toString(),
        name: studentName,
        admissionNumber: student.admissionNumber || "",
        rollNumber: student.rollNumber || "",
        photo: (student as any).photo || student.avatarUrl || studentUser?.profileImage || "",
        gender: student.gender || "",
        dob: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : "",
        fatherName: (student as any).fatherName || (student.emergencyContact?.relationship?.toLowerCase().includes("father") ? student.emergencyContact.name : ""),
        motherName: (student as any).motherName || (student.emergencyContact?.relationship?.toLowerCase().includes("mother") ? student.emergencyContact.name : ""),
        class: {
          id: ((historicalClassId as any)?._id || historicalClassId || "").toString(),
          name: resolvedClassName,
          code: resolvedClassCode,
        },
        section: {
          id: ((historicalSectionId as any)?._id || historicalSectionId || "").toString(),
          name: resolvedSectionName,
        },
      },
      exam: {
        id: exam._id.toString(),
        name: exam.name,
        description: exam.description || "",
        startDate: exam.startDate ? new Date(exam.startDate).toISOString().split("T")[0] : "",
        endDate: exam.endDate ? new Date(exam.endDate).toISOString().split("T")[0] : "",
        academicYear: {
          id: ((exam.academicYearId as any)?._id || exam.academicYearId || "").toString(),
          name: (exam.academicYearId as any)?.name || "",
        },
        status: exam.status,
      },
      academic: {
        totalObtainedMarks: evaluatedAcademic.totalObtainedMarks,
        totalMaximumMarks: evaluatedAcademic.totalMaximumMarks,
        percentage: evaluatedAcademic.percentage,
        overallGrade: evaluatedAcademic.overallGrade,
        isPassed: evaluatedAcademic.isPassed,
        statusText: evaluatedAcademic.statusText,
        subjects: subjectsWithRemarks,
      },
      attendance: {
        totalSessions,
        present,
        absent,
        late,
        halfDay,
        leave,
        attendancePercentage,
      },
      gradingScales: gradingScales || [
        { grade: "A+", minPercentage: 90, maxPercentage: 100, description: "Outstanding" },
        { grade: "A", minPercentage: 80, maxPercentage: 89.99, description: "Excellent" },
        { grade: "B+", minPercentage: 70, maxPercentage: 79.99, description: "Very Good" },
        { grade: "B", minPercentage: 60, maxPercentage: 69.99, description: "Good" },
        { grade: "C", minPercentage: 50, maxPercentage: 59.99, description: "Average" },
        { grade: "D", minPercentage: 40, maxPercentage: 49.99, description: "Pass" },
        { grade: "F", minPercentage: 0, maxPercentage: 39.99, description: "Fail" },
      ],
      resultStatus: overallResultStatus,
      generatedAt: new Date().toISOString(),
    };
  }
}
