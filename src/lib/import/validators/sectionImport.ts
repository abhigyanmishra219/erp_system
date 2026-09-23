import mongoose from "mongoose";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import { IValidationError } from "@/models/ImportSession";

export interface ValidatedSectionRow {
  rowNumber: number;
  data: {
    academicYearId: mongoose.Types.ObjectId;
    classId: mongoose.Types.ObjectId;
    academicYearName: string;
    className: string;
    name: string;
    code: string;
    capacity: number;
    isActive: boolean;
  };
}

export class SectionImportValidator {
  public static async validateRows(
    schoolId: string,
    rows: Array<{ rowNumber: number; data: Record<string, any> }>
  ): Promise<{
    validRows: ValidatedSectionRow[];
    errors: IValidationError[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    const errors: IValidationError[] = [];
    const validRows: ValidatedSectionRow[] = [];

    const [academicYears, classes, existingSections] = await Promise.all([
      AcademicYear.find({ schoolId }).lean(),
      Class.find({ schoolId }).lean(),
      Section.find({ schoolId }).lean(),
    ]);

    const yearByNameMap = new Map<string, any>();
    academicYears.forEach((ay) => yearByNameMap.set(ay.name.toLowerCase().trim(), ay));

    // key: `${yearId}_${className.toLowerCase()}`
    const classMap = new Map<string, any>();
    classes.forEach((c) => classMap.set(`${c.academicYearId.toString()}_${c.name.toLowerCase().trim()}`, c));

    // key: `${yearId}_${classId}_${sectionName.toLowerCase()}`
    const existingSectionSet = new Set<string>();
    existingSections.forEach((s) =>
      existingSectionSet.add(`${s.academicYearId.toString()}_${s.classId.toString()}_${s.name.toLowerCase().trim()}`)
    );

    const fileSectionSet = new Set<string>();

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

      // 2. Class Reference
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

      // 3. Section Name
      const rawSectionName = String(data.sectionName || "").trim();
      if (!rawSectionName) {
        errors.push({
          rowNumber,
          field: "sectionName",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Section name is required.",
        });
        hasError = true;
      } else if (academicYearDoc && classDoc) {
        const secKey = `${academicYearDoc._id.toString()}_${classDoc._id.toString()}_${rawSectionName.toLowerCase()}`;
        if (fileSectionSet.has(secKey)) {
          errors.push({
            rowNumber,
            field: "sectionName",
            value: rawSectionName,
            errorCode: "DUPLICATE_IN_FILE",
            message: `Section '${rawSectionName}' for Class '${classDoc.name}' appears multiple times in uploaded file.`,
          });
          hasError = true;
        } else if (existingSectionSet.has(secKey)) {
          errors.push({
            rowNumber,
            field: "sectionName",
            value: rawSectionName,
            errorCode: "DUPLICATE_IN_DATABASE",
            message: `Section '${rawSectionName}' already exists for Class '${classDoc.name}'.`,
          });
          hasError = true;
        } else {
          fileSectionSet.add(secKey);
        }
      }

      // 4. Capacity & Status
      const capacity = Math.max(1, parseInt(String(data.capacity || "40"), 10) || 40);
      const rawStatus = String(data.status || "ACTIVE").trim().toUpperCase();
      const isActive = rawStatus !== "INACTIVE";

      if (!hasError && academicYearDoc && classDoc && rawSectionName) {
        validRows.push({
          rowNumber,
          data: {
            academicYearId: academicYearDoc._id,
            classId: classDoc._id,
            academicYearName: academicYearDoc.name,
            className: classDoc.name,
            name: rawSectionName,
            code: String(data.sectionCode || "").trim().toUpperCase(),
            capacity,
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
