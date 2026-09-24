import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;
  const { searchParams } = new URL(req.url);

  const academicYearId = searchParams.get("academicYearId");
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const status = searchParams.get("status") || "ALL";
  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

  try {
    await connectToDatabase();

    // 1. Resolve active academic year if not supplied
    let targetYearId = academicYearId;
    if (!targetYearId || !mongoose.Types.ObjectId.isValid(targetYearId)) {
      const activeYear = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
      if (activeYear) {
        targetYearId = activeYear._id.toString();
      }
    }

    if (!targetYearId) {
      return NextResponse.json({
        success: true,
        data: {
          accounts: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
        },
      });
    }

    // 2. Build Student filter for class, section and search queries
    const studentFilter: Record<string, any> = { schoolId, status: "ACTIVE" };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      studentFilter.classId = classId;
    }
    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      studentFilter.sectionId = sectionId;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      studentFilter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { admissionNumber: searchRegex },
        { rollNumber: searchRegex },
      ];
    }

    const matchingStudents = await Student.find(studentFilter)
      .populate("classId", "name code")
      .populate("sectionId", "name code")
      .lean();

    const studentMap = new Map<string, any>();
    matchingStudents.forEach((s) => {
      studentMap.set(s._id.toString(), s);
    });

    const matchingStudentIds = matchingStudents.map((s) => s._id);

    // 3. Build Account filter
    const accountFilter: Record<string, any> = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      academicYearId: new mongoose.Types.ObjectId(targetYearId),
      studentId: { $in: matchingStudentIds },
    };

    if (status !== "ALL") {
      accountFilter.status = status;
    }

    const total = await StudentFeeAccount.countDocuments(accountFilter);
    const skip = (page - 1) * limit;

    const accounts = await StudentFeeAccount.find(accountFilter)
      .sort({ pendingAmount: -1, totalFee: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = accounts.map((acc: any) => {
      const stu = studentMap.get(acc.studentId.toString());
      const fullName = stu ? `${stu.firstName} ${stu.lastName}`.trim() : "Unknown Student";

      return {
        id: acc._id.toString(),
        student: stu
          ? {
              id: stu._id.toString(),
              name: fullName,
              admissionNumber: stu.admissionNumber || "",
              rollNumber: stu.rollNumber || "",
              class: stu.classId ? { id: stu.classId._id.toString(), name: stu.classId.name, code: stu.classId.code } : null,
              section: stu.sectionId ? { id: stu.sectionId._id.toString(), name: stu.sectionId.name } : null,
              photo: stu.avatarUrl || null,
            }
          : {
              id: acc.studentId.toString(),
              name: "Student",
              admissionNumber: "",
              rollNumber: "",
              class: null,
              section: null,
              photo: null,
            },
        totalFee: acc.totalFee,
        discountAmount: acc.discountAmount,
        concessionAmount: acc.concessionAmount,
        netFee: acc.netFee,
        paidAmount: acc.paidAmount,
        pendingAmount: acc.pendingAmount,
        lateFeeAmount: acc.lateFeeAmount || 0,
        nextDueAmount: acc.nextDueAmount,
        nextDueDate: acc.nextDueDate,
        status: acc.status,
        updatedAt: acc.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        accounts: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch student fee accounts" } },
      { status: 500 }
    );
  }
}
