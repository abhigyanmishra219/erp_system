import mongoose from "mongoose";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import { IValidationError } from "@/models/ImportSession";
import { normalizeEmail } from "@/lib/utils/email";

export interface ValidatedStudentRow {
  rowNumber: number;
  data: {
    admissionNumber: string;
    studentId: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    dateOfBirth: Date;
    academicYearId: mongoose.Types.ObjectId;
    classId: mongoose.Types.ObjectId;
    sectionId: mongoose.Types.ObjectId;
    academicYearName: string;
    className: string;
    sectionName: string;
    email: string;
    phone: string;
    bloodGroup: string;
    admissionDate: Date;
    status: "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED";
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    parent?: {
      name: string;
      email: string;
      phone: string;
      relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
    };
  };
}

export class StudentImportValidator {
  public static async validateRows(
    schoolId: string,
    rows: Array<{ rowNumber: number; data: Record<string, any> }>
  ): Promise<{
    validRows: ValidatedStudentRow[];
    errors: IValidationError[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    const errors: IValidationError[] = [];
    const validRows: ValidatedStudentRow[] = [];

    // Pre-fetch school academic structures into memory maps for fast O(1) resolution
    const [academicYears, classes, sections, existingStudents] = await Promise.all([
      AcademicYear.find({ schoolId }).lean(),
      Class.find({ schoolId }).lean(),
      Section.find({ schoolId }).lean(),
      Student.find({ schoolId }).select("admissionNumber email studentId").lean(),
    ]);

    // Fast lookup maps
    const yearByNameMap = new Map<string, any>();
    academicYears.forEach((ay) => yearByNameMap.set(ay.name.toLowerCase().trim(), ay));

    // key: `${yearId}_${className.toLowerCase()}`
    const classMap = new Map<string, any>();
    classes.forEach((c) => classMap.set(`${c.academicYearId.toString()}_${c.name.toLowerCase().trim()}`, c));

    // key: `${yearId}_${classId}_${sectionName.toLowerCase()}`
    const sectionMap = new Map<string, any>();
    sections.forEach((s) => sectionMap.set(`${s.academicYearId.toString()}_${s.classId.toString()}_${s.name.toLowerCase().trim()}`, s));

    const existingAdmissionNumbers = new Set(existingStudents.map((s) => s.admissionNumber.toUpperCase().trim()));
    const existingEmails = new Set(
      existingStudents.map((s) => (s.email ? normalizeEmail(s.email) : "")).filter(Boolean)
    );

    // In-file duplicate tracking
    const fileAdmissionNumbers = new Set<string>();
    const fileEmails = new Set<string>();

    for (const { rowNumber, data } of rows) {
      let hasError = false;

      // 1. Admission Number
      const rawAdm = String(data.admissionNumber || "").trim();
      if (!rawAdm) {
        errors.push({
          rowNumber,
          field: "admissionNumber",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Admission Number is required.",
        });
        hasError = true;
      } else {
        const normAdm = rawAdm.toUpperCase();
        if (fileAdmissionNumbers.has(normAdm)) {
          errors.push({
            rowNumber,
            field: "admissionNumber",
            value: rawAdm,
            errorCode: "DUPLICATE_IN_FILE",
            message: `Duplicate Admission Number '${rawAdm}' appears multiple times in uploaded file.`,
          });
          hasError = true;
        } else if (existingAdmissionNumbers.has(normAdm)) {
          errors.push({
            rowNumber,
            field: "admissionNumber",
            value: rawAdm,
            errorCode: "DUPLICATE_IN_DATABASE",
            message: `Student with Admission Number '${rawAdm}' already exists in this school.`,
          });
          hasError = true;
        } else {
          fileAdmissionNumbers.add(normAdm);
        }
      }

      // 2. Names
      const firstName = String(data.firstName || "").trim();
      const lastName = String(data.lastName || "").trim();
      if (!firstName) {
        errors.push({
          rowNumber,
          field: "firstName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "First Name is required.",
        });
        hasError = true;
      }
      if (!lastName) {
        errors.push({
          rowNumber,
          field: "lastName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Last Name is required.",
        });
        hasError = true;
      }

      // 3. Gender
      const rawGender = String(data.gender || "").trim().toUpperCase();
      let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
      if (!rawGender) {
        errors.push({
          rowNumber,
          field: "gender",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Gender is required (MALE, FEMALE, or OTHER).",
        });
        hasError = true;
      } else if (!["MALE", "FEMALE", "OTHER"].includes(rawGender)) {
        errors.push({
          rowNumber,
          field: "gender",
          value: rawGender,
          errorCode: "INVALID_ENUM",
          message: `Invalid gender '${rawGender}'. Accepted: MALE, FEMALE, OTHER.`,
        });
        hasError = true;
      } else {
        gender = rawGender as "MALE" | "FEMALE" | "OTHER";
      }

      // 4. Date of Birth
      const rawDob = data.dateOfBirth;
      let dob: Date | null = null;
      if (!rawDob) {
        errors.push({
          rowNumber,
          field: "dateOfBirth",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Date of Birth is required.",
        });
        hasError = true;
      } else {
        dob = new Date(rawDob);
        if (isNaN(dob.getTime())) {
          errors.push({
            rowNumber,
            field: "dateOfBirth",
            value: String(rawDob),
            errorCode: "INVALID_DATE",
            message: "Invalid Date of Birth format. Please use YYYY-MM-DD or DD/MM/YYYY.",
          });
          hasError = true;
        } else if (dob > new Date()) {
          errors.push({
            rowNumber,
            field: "dateOfBirth",
            value: String(rawDob),
            errorCode: "BUSINESS_RULE_VIOLATION",
            message: "Date of Birth cannot be in the future.",
          });
          hasError = true;
        }
      }

      // 5. Academic Year Reference
      const rawYear = String(data.academicYear || "").trim();
      let academicYearDoc = null;
      if (!rawYear) {
        errors.push({
          rowNumber,
          field: "academicYear",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Academic Year is required.",
        });
        hasError = true;
      } else {
        academicYearDoc = yearByNameMap.get(rawYear.toLowerCase());
        if (!academicYearDoc) {
          errors.push({
            rowNumber,
            field: "academicYear",
            value: rawYear,
            errorCode: "INVALID_REFERENCE",
            message: `Academic Year '${rawYear}' does not exist in your school.`,
          });
          hasError = true;
        }
      }

      // 6. Class Reference
      const rawClass = String(data.className || "").trim();
      let classDoc = null;
      if (!rawClass) {
        errors.push({
          rowNumber,
          field: "className",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Class name is required.",
        });
        hasError = true;
      } else if (academicYearDoc) {
        classDoc = classMap.get(`${academicYearDoc._id.toString()}_${rawClass.toLowerCase()}`);
        if (!classDoc) {
          errors.push({
            rowNumber,
            field: "className",
            value: rawClass,
            errorCode: "INVALID_REFERENCE",
            message: `Class '${rawClass}' does not exist for Academic Year '${academicYearDoc.name}'.`,
          });
          hasError = true;
        }
      }

      // 7. Section Reference
      const rawSection = String(data.sectionName || "").trim();
      let sectionDoc = null;
      if (!rawSection) {
        errors.push({
          rowNumber,
          field: "sectionName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Section name is required.",
        });
        hasError = true;
      } else if (academicYearDoc && classDoc) {
        sectionDoc = sectionMap.get(
          `${academicYearDoc._id.toString()}_${classDoc._id.toString()}_${rawSection.toLowerCase()}`
        );
        if (!sectionDoc) {
          errors.push({
            rowNumber,
            field: "sectionName",
            value: rawSection,
            errorCode: "INVALID_REFERENCE",
            message: `Section '${rawSection}' does not exist for Class '${classDoc.name}'.`,
          });
          hasError = true;
        }
      }

      // 8. Email Uniqueness
      let studentEmail = "";
      if (data.email) {
        const normEmail = normalizeEmail(String(data.email));
        if (normEmail) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
            errors.push({
              rowNumber,
              field: "email",
              value: String(data.email),
              errorCode: "INVALID_FORMAT",
              message: "Invalid student email format.",
            });
            hasError = true;
          } else if (fileEmails.has(normEmail)) {
            errors.push({
              rowNumber,
              field: "email",
              value: String(data.email),
              errorCode: "DUPLICATE_IN_FILE",
              message: `Duplicate student email '${normEmail}' appears multiple times in uploaded file.`,
            });
            hasError = true;
          } else if (existingEmails.has(normEmail)) {
            errors.push({
              rowNumber,
              field: "email",
              value: String(data.email),
              errorCode: "DUPLICATE_IN_DATABASE",
              message: `A student with email '${normEmail}' already exists in your school.`,
            });
            hasError = true;
          } else {
            fileEmails.add(normEmail);
            studentEmail = normEmail;
          }
        }
      }

      // 9. Status & Optional fields
      const rawStatus = String(data.status || "ACTIVE").trim().toUpperCase();
      const status = ["ACTIVE", "INACTIVE", "TRANSFERRED", "GRADUATED"].includes(rawStatus)
        ? (rawStatus as "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED")
        : "ACTIVE";

      const admissionDate = data.admissionDate && !isNaN(new Date(data.admissionDate).getTime())
        ? new Date(data.admissionDate)
        : new Date();

      // Parent Info if supplied
      let parentObj = undefined;
      const parentName = String(data.parentName || "").trim();
      const parentEmail = data.parentEmail ? normalizeEmail(String(data.parentEmail)) : "";
      if (parentName || parentEmail) {
        const rawRel = String(data.parentRelationship || "FATHER").trim().toUpperCase();
        const relationship = ["FATHER", "MOTHER", "GUARDIAN", "OTHER"].includes(rawRel)
          ? (rawRel as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER")
          : "FATHER";

        parentObj = {
          name: parentName || "Parent",
          email: parentEmail,
          phone: String(data.parentPhone || "").trim(),
          relationship,
        };
      }

      if (!hasError && academicYearDoc && classDoc && sectionDoc && dob) {
        validRows.push({
          rowNumber,
          data: {
            admissionNumber: rawAdm.toUpperCase(),
            studentId: String(data.studentId || rawAdm).trim().toUpperCase(),
            rollNumber: String(data.rollNumber || "").trim(),
            firstName,
            lastName,
            gender,
            dateOfBirth: dob,
            academicYearId: academicYearDoc._id,
            classId: classDoc._id,
            sectionId: sectionDoc._id,
            academicYearName: academicYearDoc.name,
            className: classDoc.name,
            sectionName: sectionDoc.name,
            email: studentEmail,
            phone: String(data.phone || "").trim(),
            bloodGroup: String(data.bloodGroup || "").trim(),
            admissionDate,
            status,
            address: {
              street: String(data.street || "").trim(),
              city: String(data.city || "").trim(),
              state: String(data.state || "").trim(),
              postalCode: String(data.postalCode || "").trim(),
              country: String(data.country || "India").trim(),
            },
            parent: parentObj,
          },
        });
      }
    }

    return {
      validRows,
      errors,
      summary: {
        total: rows.length,
        valid: validRows.length,
        invalid: rows.length - validRows.length,
      },
    };
  }
}
