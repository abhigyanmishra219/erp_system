import mongoose from "mongoose";
import Parent from "@/models/Parent";
import Student from "@/models/Student";
import { IValidationError } from "@/models/ImportSession";
import { normalizeEmail } from "@/lib/utils/email";

export interface ValidatedParentRow {
  rowNumber: number;
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
    occupation: string;
    status: "ACTIVE" | "INACTIVE";
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    linkedStudentIds: mongoose.Types.ObjectId[];
  };
}

export class ParentImportValidator {
  public static async validateRows(
    schoolId: string,
    rows: Array<{ rowNumber: number; data: Record<string, any> }>
  ): Promise<{
    validRows: ValidatedParentRow[];
    errors: IValidationError[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    const errors: IValidationError[] = [];
    const validRows: ValidatedParentRow[] = [];

    const [existingParents, existingStudents] = await Promise.all([
      Parent.find({ schoolId }).select("email").lean(),
      Student.find({ schoolId }).select("_id admissionNumber studentId").lean(),
    ]);

    const existingEmails = new Set(existingParents.map((p) => normalizeEmail(p.email)));
    const studentByAdmMap = new Map<string, any>();
    existingStudents.forEach((s) => {
      studentByAdmMap.set(s.admissionNumber.toUpperCase().trim(), s);
      if (s.studentId) studentByAdmMap.set(s.studentId.toUpperCase().trim(), s);
    });

    const fileEmails = new Set<string>();

    for (const { rowNumber, data } of rows) {
      let hasError = false;

      // 1. First & Last Name
      const firstName = String(data.firstName || "").trim();
      const lastName = String(data.lastName || "").trim();
      if (!firstName) {
        errors.push({
          rowNumber,
          field: "firstName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Parent First Name is required.",
        });
        hasError = true;
      }
      if (!lastName) {
        errors.push({
          rowNumber,
          field: "lastName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Parent Last Name is required.",
        });
        hasError = true;
      }

      // 2. Email
      const rawEmail = String(data.email || "").trim();
      const normEmail = normalizeEmail(rawEmail);
      if (!normEmail) {
        errors.push({
          rowNumber,
          field: "email",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Parent Email is required.",
        });
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
        errors.push({
          rowNumber,
          field: "email",
          value: rawEmail,
          errorCode: "INVALID_FORMAT",
          message: "Invalid parent email format.",
        });
        hasError = true;
      } else if (fileEmails.has(normEmail)) {
        errors.push({
          rowNumber,
          field: "email",
          value: rawEmail,
          errorCode: "DUPLICATE_IN_FILE",
          message: `Duplicate parent email '${normEmail}' appears multiple times in uploaded file.`,
        });
        hasError = true;
      } else if (existingEmails.has(normEmail)) {
        errors.push({
          rowNumber,
          field: "email",
          value: rawEmail,
          errorCode: "DUPLICATE_IN_DATABASE",
          message: `A parent with email '${normEmail}' already exists in your school.`,
        });
        hasError = true;
      } else {
        fileEmails.add(normEmail);
      }

      // 3. Phone
      const phone = String(data.phone || "").trim();
      if (!phone) {
        errors.push({
          rowNumber,
          field: "phone",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Phone number is required.",
        });
        hasError = true;
      }

      // 4. Relationship
      const rawRel = String(data.relationship || "FATHER").trim().toUpperCase();
      let relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER" = "FATHER";
      if (["FATHER", "MOTHER", "GUARDIAN", "OTHER"].includes(rawRel)) {
        relationship = rawRel as "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
      } else {
        errors.push({
          rowNumber,
          field: "relationship",
          value: rawRel,
          errorCode: "INVALID_ENUM",
          message: `Invalid relationship '${rawRel}'. Accepted: FATHER, MOTHER, GUARDIAN, OTHER.`,
        });
        hasError = true;
      }

      // 5. Linked Student Admission Number(s)
      const linkedStudentIds: mongoose.Types.ObjectId[] = [];
      const rawAdmList = String(data.studentAdmissionNumber || "").trim();
      if (rawAdmList) {
        const tokens = rawAdmList.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
        for (const token of tokens) {
          const studentDoc = studentByAdmMap.get(token.toUpperCase());
          if (!studentDoc) {
            errors.push({
              rowNumber,
              field: "studentAdmissionNumber",
              value: token,
              errorCode: "INVALID_REFERENCE",
              message: `Referenced student with Admission No '${token}' not found in your school.`,
            });
            hasError = true;
          } else {
            linkedStudentIds.push(studentDoc._id);
          }
        }
      }

      // 6. Status
      const rawStatus = String(data.status || "ACTIVE").trim().toUpperCase();
      const status: "ACTIVE" | "INACTIVE" = rawStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";

      if (!hasError && normEmail) {
        validRows.push({
          rowNumber,
          data: {
            firstName,
            lastName,
            email: normEmail,
            phone,
            relationship,
            occupation: String(data.occupation || "").trim(),
            status,
            address: {
              street: String(data.street || "").trim(),
              city: String(data.city || "").trim(),
              state: String(data.state || "").trim(),
              postalCode: String(data.postalCode || "").trim(),
              country: String(data.country || "India").trim(),
            },
            linkedStudentIds,
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
