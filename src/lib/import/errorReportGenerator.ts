import ExcelJS from "exceljs";
import { IValidationError } from "@/models/ImportSession";

export class ErrorReportGenerator {
  /**
   * Generates a downloadable Excel (.xlsx) report containing all row-level validation errors.
   */
  public static async generateErrorReportBuffer(
    importType: string,
    fileName: string,
    errors: IValidationError[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School ERP SaaS";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Validation Errors", {
      views: [{ showGridLines: true }],
    });

    // Title
    const titleRow = worksheet.addRow([`IMPORT VALIDATION ERROR REPORT — ${importType}`]);
    titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF991B1B" } }; // Crimson

    worksheet.addRow([`Original File: ${fileName} | Generated: ${new Date().toLocaleString()}`]);
    worksheet.addRow([`Total Errors: ${errors.length} | Fix the highlighted rows in your original file and re-upload.`]);
    worksheet.addRow([]); // Spacer

    // Header Row
    const headers = ["Row #", "Field Name", "Submitted Value", "Error Code", "Reason / Remediation", "Severity"];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDC2626" }, // Red header
      };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "medium", color: { argb: "FF7F1D1D" } },
      };
    });

    // Data Rows
    for (const err of errors) {
      const dataRow = worksheet.addRow([
        err.rowNumber,
        err.field,
        err.value || "—",
        err.errorCode,
        err.message,
        err.isWarning ? "WARNING" : "ERROR",
      ]);
      dataRow.height = 20;

      dataRow.eachCell((cell, colIndex) => {
        cell.font = { name: "Arial", size: 9 };
        cell.alignment = {
          vertical: "middle",
          horizontal: colIndex === 1 || colIndex === 6 ? "center" : "left",
        };
        cell.border = { bottom: { style: "thin", color: { argb: "FFFEE2E2" } } };

        if (colIndex === 6) {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: err.isWarning ? "FFD97706" : "FFDC2626" } };
        }
      });
    }

    worksheet.columns = [
      { width: 10 },
      { width: 22 },
      { width: 28 },
      { width: 26 },
      { width: 60 },
      { width: 14 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
