import ExcelJS from "exceljs";

export interface ParsedExcelResult {
  headers: string[];
  duplicateHeaders: string[];
  rows: Array<{
    rowNumber: number;
    rawValues: Record<string, any>;
  }>;
  totalRows: number;
  sheetName: string;
}

export class ExcelParser {
  public static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  /**
   * Safely parses an uploaded Excel buffer, extracts headers, sanitizes cells, and structures rows.
   */
  public static async parseBuffer(buffer: Buffer): Promise<ParsedExcelResult> {
    if (!buffer || buffer.length === 0) {
      throw new Error("Uploaded file is empty.");
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (err: any) {
      throw new Error("Invalid or corrupted Excel file. Please ensure it is a valid .xlsx file.");
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount === 0) {
      throw new Error("Excel workbook contains no data or worksheets.");
    }

    let headerRowNumber = 1;
    let headers: string[] = [];
    const duplicateHeaders: string[] = [];
    const seenHeaders = new Set<string>();

    // Locate first non-empty header row (skipping instructions if user left banner)
    for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      const cellValues: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const text = this.cellToString(cell.value).trim();
        if (text) cellValues.push(text);
      });

      // If this row looks like a header row (has multiple columns and doesn't start with "INSTRUCTIONS" or "TEMPLATE")
      if (cellValues.length >= 2 && !cellValues[0].toUpperCase().includes("TEMPLATE") && !cellValues[0].toUpperCase().includes("INSTRUCTIONS")) {
        headerRowNumber = r;
        break;
      }
    }

    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      let rawHeader = this.cellToString(cell.value).trim();
      // Remove trailing asterisk (*)
      rawHeader = rawHeader.replace(/\s*\*\s*$/, "").trim();

      if (rawHeader) {
        if (seenHeaders.has(rawHeader.toLowerCase())) {
          duplicateHeaders.push(rawHeader);
        } else {
          seenHeaders.add(rawHeader.toLowerCase());
        }
        headers.push(rawHeader);
      }
    });

    if (headers.length === 0) {
      throw new Error("No readable column headers found in the worksheet.");
    }

    const rows: Array<{ rowNumber: number; rawValues: Record<string, any> }> = [];

    // Parse subsequent data rows
    for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const rowObj: Record<string, any> = {};
      let hasData = false;

      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        const cellVal = this.sanitizeCellValue(cell.value);
        if (cellVal !== null && cellVal !== undefined && cellVal !== "") {
          hasData = true;
          rowObj[header] = cellVal;
        } else {
          rowObj[header] = null;
        }
      });

      // Ignore completely empty rows
      if (hasData) {
        rows.push({
          rowNumber: r,
          rawValues: rowObj,
        });
      }
    }

    return {
      headers,
      duplicateHeaders,
      rows,
      totalRows: rows.length,
      sheetName: worksheet.name,
    };
  }

  /**
   * Helper to convert ExcelJS cell value object/date/formula into clean string or number.
   */
  private static cellToString(value: any): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return String(value);
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "object") {
      // ExcelJS formula / rich text object handling
      if (value.result !== undefined) return String(value.result);
      if (value.text !== undefined) return String(value.text);
      if (Array.isArray(value.richText)) {
        return value.richText.map((rt: any) => rt.text || "").join("");
      }
    }
    return String(value);
  }

  /**
   * Sanitizes cell values to prevent CSV/Formula injection and normalize types.
   */
  private static sanitizeCellValue(value: any): any {
    if (value === null || value === undefined) return null;

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === "number") {
      return value;
    }

    let str = this.cellToString(value).trim();
    if (!str) return null;

    // Defuse leading formula characters if interpreted literally
    if (str.startsWith("=") || str.startsWith("+") || str.startsWith("@")) {
      str = str.replace(/^[=+@]+/, "").trim();
    }

    return str;
  }
}
