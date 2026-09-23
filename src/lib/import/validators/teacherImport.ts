import Teacher from "@/models/Teacher";
import { IValidationError } from "@/models/ImportSession";
import { normalizeEmail } from "@/lib/utils/email";

export interface ValidatedTeacherRow {
  rowNumber: number;
  data: {
    teacherId: string;
    employeeId: string;
    firstName: string;
    middleName: string;
    lastName: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    email: string;
    phone: string;
    department: string;
    designation: string;
    qualification: string;
    joiningDate: Date;
    dateOfBirth?: Date;
    status: "ACTIVE" | "INACTIVE";
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

export class TeacherImportValidator {
  public static async validateRows(
    schoolId: string,
    rows: Array<{ rowNumber: number; data: Record<string, any> }>
  ): Promise<{
    validRows: ValidatedTeacherRow[];
    errors: IValidationError[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    const errors: IValidationError[] = [];
    const validRows: ValidatedTeacherRow[] = [];

    const existingTeachers = await Teacher.find({ schoolId })
      .select("teacherId employeeId email")
      .lean();

    const existingTeacherIds = new Set(existingTeachers.map((t) => t.teacherId.toUpperCase().trim()));
    const existingEmployeeIds = new Set(
      existingTeachers.map((t) => (t.employeeId ? t.employeeId.toUpperCase().trim() : "")).filter(Boolean)
    );
    const existingEmails = new Set(
      existingTeachers.map((t) => (t.email ? normalizeEmail(t.email) : "")).filter(Boolean)
    );

    const fileTeacherIds = new Set<string>();
    const fileEmployeeIds = new Set<string>();
    const fileEmails = new Set<string>();

    for (const { rowNumber, data } of rows) {
      let hasError = false;

      // 1. Teacher ID
      const rawTeacherId = String(data.teacherId || "").trim();
      if (!rawTeacherId) {
        errors.push({
          rowNumber,
          field: "teacherId",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Teacher ID is required.",
        });
        hasError = true;
      } else {
        const normId = rawTeacherId.toUpperCase();
        if (fileTeacherIds.has(normId)) {
          errors.push({
            rowNumber,
            field: "teacherId",
            value: rawTeacherId,
            errorCode: "DUPLICATE_IN_FILE",
            message: `Duplicate Teacher ID '${rawTeacherId}' appears multiple times in uploaded file.`,
          });
          hasError = true;
        } else if (existingTeacherIds.has(normId)) {
          errors.push({
            rowNumber,
            field: "teacherId",
            value: rawTeacherId,
            errorCode: "DUPLICATE_IN_DATABASE",
            message: `A teacher with ID '${rawTeacherId}' already exists in your school.`,
          });
          hasError = true;
        } else {
          fileTeacherIds.add(normId);
        }
      }

      // 2. Employee ID (Optional)
      const rawEmpId = String(data.employeeId || "").trim();
      let employeeId = "";
      if (rawEmpId) {
        const normEmpId = rawEmpId.toUpperCase();
        if (fileEmployeeIds.has(normEmpId)) {
          errors.push({
            rowNumber,
            field: "employeeId",
            value: rawEmpId,
            errorCode: "DUPLICATE_IN_FILE",
            message: `Duplicate Employee ID '${rawEmpId}' appears multiple times in uploaded file.`,
          });
          hasError = true;
        } else if (existingEmployeeIds.has(normEmpId)) {
          errors.push({
            rowNumber,
            field: "employeeId",
            value: rawEmpId,
            errorCode: "DUPLICATE_IN_DATABASE",
            message: `A teacher with Employee ID '${rawEmpId}' already exists in your school.`,
          });
          hasError = true;
        } else {
          fileEmployeeIds.add(normEmpId);
          employeeId = rawEmpId;
        }
      }

      // 3. First & Last Name
      const firstName = String(data.firstName || "").trim();
      const lastName = String(data.lastName || "").trim();
      if (!firstName) {
        errors.push({
          rowNumber,
          field: "firstName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Teacher First Name is required.",
        });
        hasError = true;
      }
      if (!lastName) {
        errors.push({
          rowNumber,
          field: "lastName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Teacher Last Name is required.",
        });
        hasError = true;
      }

      // 4. Gender
      const rawGender = String(data.gender || "MALE").trim().toUpperCase();
      let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
      if (["MALE", "FEMALE", "OTHER"].includes(rawGender)) {
        gender = rawGender as "MALE" | "FEMALE" | "OTHER";
      } else {
        errors.push({
          rowNumber,
          field: "gender",
          value: rawGender,
          errorCode: "INVALID_ENUM",
          message: `Invalid gender '${rawGender}'. Accepted: MALE, FEMALE, OTHER.`,
        });
        hasError = true;
      }

      // 5. Email (Optional)
      let teacherEmail = "";
      if (data.email) {
        const normEmail = normalizeEmail(String(data.email));
        if (normEmail) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
            errors.push({
              rowNumber,
              field: "email",
              value: String(data.email),
              errorCode: "INVALID_FORMAT",
              message: "Invalid teacher email format.",
            });
            hasError = true;
          } else if (fileEmails.has(normEmail)) {
            errors.push({
              rowNumber,
              field: "email",
              value: String(data.email),
              errorCode: "DUPLICATE_IN_FILE",
              message: `Duplicate teacher email '${normEmail}' appears multiple times in uploaded file.`,
            });
            hasError = true;
          } else if (existingEmails.has(normEmail)) {
            errors.push({
              rowNumber,
              field: "email",
              value: String(data.email),
              errorCode: "DUPLICATE_IN_DATABASE",
              message: `A teacher with email '${normEmail}' already exists in your school.`,
            });
            hasError = true;
          } else {
            fileEmails.add(normEmail);
            teacherEmail = normEmail;
          }
        }
      }

      // 6. Joining Date & DOB
      const joiningDate = data.joiningDate && !isNaN(new Date(data.joiningDate).getTime())
        ? new Date(data.joiningDate)
        : new Date();

      let dateOfBirth: Date | undefined = undefined;
      if (data.dateOfBirth && !isNaN(new Date(data.dateOfBirth).getTime())) {
        dateOfBirth = new Date(data.dateOfBirth);
      }

      // 7. Status
      const rawStatus = String(data.status || "ACTIVE").trim().toUpperCase();
      const status: "ACTIVE" | "INACTIVE" = rawStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";

      if (!hasError && rawTeacherId) {
        validRows.push({
          rowNumber,
          data: {
            teacherId: rawTeacherId.toUpperCase(),
            employeeId,
            firstName,
            middleName: String(data.middleName || "").trim(),
            lastName,
            gender,
            email: teacherEmail,
            phone: String(data.phone || "").trim(),
            department: String(data.department || "Academics").trim(),
            designation: String(data.designation || "Teacher").trim(),
            qualification: String(data.qualification || "").trim(),
            joiningDate,
            dateOfBirth,
            status,
            address: {
              street: String(data.street || "").trim(),
              city: String(data.city || "").trim(),
              state: String(data.state || "").trim(),
              postalCode: String(data.postalCode || "").trim(),
              country: String(data.country || "India").trim(),
            },
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
