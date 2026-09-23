import mongoose from "mongoose";
import Class from "@/models/Class";
import AcademicYear from "@/models/AcademicYear";
import { IValidationError } from "@/models/ImportSession";

export interface ValidatedClassRow {
  rowNumber: number;
  data: {
    academicYearId: mongoose.Types.ObjectId;
    academicYearName: string;
    name: string;
    code: string;
    displayOrder: number;
    isActive: boolean;
  };
}

export class ClassImportValidator {
  public static async validateRows(
    schoolId: string,
    rows: Array<{ rowNumber: number; data: Record<string, any> }>
  ): Promise<{
    validRows: ValidatedClassRow[];
    errors: IValidationError[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    const errors: IValidationError[] = [];
    const validRows: ValidatedClassRow[] = [];

    const [academicYears, existingClasses] = await Promise.all([
      AcademicYear.find({ schoolId }).lean(),
      Class.find({ schoolId }).lean(),
    ]);

    const yearByNameMap = new Map<string, any>();
    academicYears.forEach((ay) => yearByNameMap.set(ay.name.toLowerCase().trim(), ay));

    const existingClassSet = new Set<string>();
    existingClasses.forEach((c) =>
      existingClassSet.add(`${c.academicYearId.toString()}_${c.name.toLowerCase().trim()}`)
    );

    const fileClassSet = new Set<string>();

    for (const { rowNumber, data } of rows) {
      let hasError = false;

      // 1. Academic Year
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

      // 2. Class Name
      const rawClassName = String(data.className || "").trim();
      if (!rawClassName) {
        errors.push({
          rowNumber,
          field: "className",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Class Name is required.",
        });
        hasError = true;
      } else if (academicYearDoc) {
        const classKey = `${academicYearDoc._id.toString()}_${rawClassName.toLowerCase()}`;
        if (fileClassSet.has(classKey)) {
          errors.push({
            rowNumber,
            field: "className",
            value: rawClassName,
            errorCode: "DUPLICATE_IN_FILE",
            message: `Class '${rawClassName}' for Academic Year '${academicYearDoc.name}' appears multiple times in uploaded file.`,
          });
          hasError = true;
        } else if (existingClassSet.has(classKey)) {
          errors.push({
            rowNumber,
            field: "className",
            value: rawClassName,
            errorCode: "DUPLICATE_IN_DATABASE",
            message: `Class '${rawClassName}' already exists for Academic Year '${academicYearDoc.name}'.`,
          });
          hasError = true;
        } else {
          fileClassSet.add(classKey);
        }
      }

      // 3. Display Order & Code
      const displayOrder = parseInt(String(data.displayOrder || "0"), 10) || 0;
      const rawStatus = String(data.status || "ACTIVE").trim().toUpperCase();
      const isActive = rawStatus !== "INACTIVE";

      if (!hasError && academicYearDoc && rawClassName) {
        validRows.push({
          rowNumber,
          data: {
            academicYearId: academicYearDoc._id,
            academicYearName: academicYearDoc.name,
            name: rawClassName,
            code: String(data.classCode || "").trim().toUpperCase(),
            displayOrder,
            isActive,
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
