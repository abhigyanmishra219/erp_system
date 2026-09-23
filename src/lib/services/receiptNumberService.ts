import mongoose from "mongoose";
import FeeReceiptCounter from "@/models/FeeReceiptCounter";
import AcademicYear from "@/models/AcademicYear";

export class ReceiptNumberService {
  /**
   * Generates a unique, concurrency-safe sequential receipt number for a school & academic year
   * Format: REC-YYYY-000001
   */
  static async generateReceiptNumber(
    schoolId: mongoose.Types.ObjectId | string,
    academicYearId: mongoose.Types.ObjectId | string,
    customPrefix: string = "REC"
  ): Promise<string> {
    const sId = new mongoose.Types.ObjectId(schoolId.toString());
    const ayId = new mongoose.Types.ObjectId(academicYearId.toString());

    // Retrieve academic year name or year code
    const yearDoc = await AcademicYear.findById(ayId).lean();
    let yearPrefix = new Date().getFullYear().toString();
    if (yearDoc && yearDoc.name) {
      const match = yearDoc.name.match(/\d{4}/);
      if (match) yearPrefix = match[0];
    }

    const cleanPrefix = customPrefix.trim().toUpperCase() || "REC";

    // Atomically increment sequential counter
    const counter = await FeeReceiptCounter.findOneAndUpdate(
      {
        schoolId: sId,
        academicYearId: ayId,
        prefix: cleanPrefix,
      },
      {
        $inc: { seq: 1 },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const sequenceNumber = counter.seq.toString().padStart(6, "0");
    return `${cleanPrefix}-${yearPrefix}-${sequenceNumber}`;
  }
}
