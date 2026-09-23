import ExcelJS from "exceljs";
import { ImportType } from "@/models/ImportSession";
import { IMPORT_CONFIGS, FieldDefinition } from "./types";

export class TemplateGenerator {
  /**
   * Generates a fully-styled, enterprise-grade Excel (.xlsx) template for a given import category.
   */
  public static async generateTemplateBuffer(type: ImportType): Promise<Buffer> {
    const config = IMPORT_CONFIGS[type];
    if (!config) {
      throw new Error(`Unsupported import type: ${type}`);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School ERP SaaS";
    workbook.created = new Date();

    // 1. Main Data Worksheet
    const dataSheet = workbook.addWorksheet("Data", {
      views: [{ showGridLines: true }],
    });

    // Title Row
    const titleRow = dataSheet.addRow([`${config.title.toUpperCase()} IMPORT TEMPLATE`]);
    titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF312E81" } };
    titleRow.height = 24;

    // Instructions Row
    const infoRow = dataSheet.addRow([
      "INSTRUCTIONS: Enter your school records in the table below. Columns marked with (*) are mandatory. Do NOT alter header names.",
    ]);
    infoRow.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF4B5563" } };
    infoRow.height = 18;

    dataSheet.addRow([]); // Blank spacer

    // Table Header Row
    const headers = config.fields.map((f) => (f.required ? `${f.label} *` : f.label));
    const headerRow = dataSheet.addRow(headers);
    headerRow.height = 26;

    headerRow.eachCell((cell, colIndex) => {
      const field = config.fields[colIndex - 1];
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: field.required ? "FF4F46E5" : "FF6B7280" }, // Indigo for required, Slate for optional
      };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "medium", color: { argb: "FF1E1B4B" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });

    // Sample Row 1
    const sample1 = config.fields.map((f) => f.sample);
    const sampleRow1 = dataSheet.addRow(sample1);
    sampleRow1.height = 20;
    sampleRow1.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9, color: { argb: "FF1F2937" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });

    // Sample Row 2 (Alternative variation for sample guidance)
    const sample2 = config.fields.map((f) => {
      if (f.key === "admissionNumber") return "ADM-2026-002";
      if (f.key === "studentId") return "STU-002";
      if (f.key === "firstName") return "Priya";
      if (f.key === "lastName") return "Patel";
      if (f.key === "gender") return "FEMALE";
      if (f.key === "dateOfBirth") return "2015-08-24";
      if (f.key === "rollNumber") return "102";
      if (f.key === "email") return "priya.patel@example.com";
      if (f.key === "phone") return "9876543212";
      if (f.key === "bloodGroup") return "B+";
      if (f.key === "parentName") return "Vikram Patel";
      if (f.key === "parentEmail") return "vikram.patel@example.com";
      if (f.key === "parentPhone") return "9876543213";
      if (f.key === "teacherId") return "TCH-002";
      if (f.key === "employeeId") return "EMP-1002";
      if (f.key === "className") return "Class 2";
      if (f.key === "sectionName") return "B";
      if (f.key === "receiptNumber") return "RCPT-2026-002";
      if (f.key === "amount") return 20000;
      if (f.key === "paymentMethod") return "BANK_TRANSFER";
      return f.sample;
    });

    const sampleRow2 = dataSheet.addRow(sample2);
    sampleRow2.height = 20;
    sampleRow2.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9, color: { argb: "FF1F2937" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });

    // Auto-fit column widths
    dataSheet.columns.forEach((col, index) => {
      const field = config.fields[index];
      if (field) {
        const headerLen = field.label.length + (field.required ? 4 : 2);
        const sampleLen = String(field.sample || "").length;
        col.width = Math.max(16, headerLen + 4, sampleLen + 6);
      }
    });

    // 2. Guidelines & Accepted Values Worksheet
    const guideSheet = workbook.addWorksheet("Accepted Values & Guidelines", {
      views: [{ showGridLines: true }],
    });

    const guideTitle = guideSheet.addRow(["FIELD GUIDELINES & ACCEPTED FORMATS"]);
    guideTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF312E81" } };

    guideSheet.addRow([]);

    const guideHeader = guideSheet.addRow(["Field Name", "Required", "Data Type", "Accepted Values / Format", "Description"]);
    guideHeader.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    guideHeader.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    for (const field of config.fields) {
      const acceptedValues = field.options ? field.options.join(", ") : field.type === "date" ? "YYYY-MM-DD or DD/MM/YYYY" : "Standard text / numbers";
      const gRow = guideSheet.addRow([
        field.label,
        field.required ? "YES" : "NO",
        field.type.toUpperCase(),
        acceptedValues,
        field.description,
      ]);
      gRow.font = { name: "Arial", size: 9 };
    }

    guideSheet.columns = [
      { width: 24 },
      { width: 12 },
      { width: 14 },
      { width: 34 },
      { width: 50 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
