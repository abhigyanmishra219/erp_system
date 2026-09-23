import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import Teacher from "@/models/Teacher";
import Class from "@/models/Class";
import Section from "@/models/Section";
import FeePayment from "@/models/FeePayment";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import StudentParent from "@/models/StudentParent";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import ImportSession, { IImportSession } from "@/models/ImportSession";
import { generateTemporaryPassword } from "@/lib/tempPassword";
import { normalizeEmail } from "@/lib/utils/email";

export interface ExecutionResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  skippedRows: number;
  errors: Array<{ rowNumber: number; message: string }>;
}

export class ImportExecutor {
  public static readonly BATCH_SIZE = 50;

  /**
   * Executes the batch import for validated rows belonging to an import session.
   */
  public static async executeImport(
    session: IImportSession,
    validDataList: any[],
    authUserId: string,
    authUserRole: any
  ): Promise<ExecutionResult> {
    const schoolId = session.schoolId.toString();
    const result: ExecutionResult = {
      success: true,
      totalRows: session.totalRows,
      importedRows: 0,
      failedRows: 0,
      skippedRows: session.invalidRows,
      errors: [],
    };

    try {
      if (session.type === "STUDENTS") {
        await this.importStudents(schoolId, validDataList, authUserId, authUserRole, result);
      } else if (session.type === "PARENTS") {
        await this.importParents(schoolId, validDataList, authUserId, authUserRole, result);
      } else if (session.type === "TEACHERS") {
        await this.importTeachers(schoolId, validDataList, authUserId, authUserRole, result);
      } else if (session.type === "CLASSES") {
        await this.importClasses(schoolId, validDataList, authUserId, authUserRole, result);
      } else if (session.type === "SECTIONS") {
        await this.importSections(schoolId, validDataList, authUserId, authUserRole, result);
      } else if (session.type === "FEES") {
        await this.importFees(schoolId, validDataList, authUserId, authUserRole, result);
      }

      // Update Session Status
      session.status = "COMPLETED";
      session.importedRows = result.importedRows;
      session.failedRows = result.failedRows;
      session.completedAt = new Date();
      session.summary = {
        total: session.totalRows,
        imported: result.importedRows,
        failed: result.failedRows,
        skipped: result.skippedRows,
      };
      await session.save();

      // Audit Log for import completion
      await AuditLog.create({
        userId: authUserId,
        userRole: authUserRole,
        action: "EXCEL_IMPORT_COMPLETED",
        entityType: "IMPORT_SESSION",
        entityId: session._id.toString(),
        schoolId,
        metadata: {
          importType: session.type,
          fileName: session.fileName,
          totalRows: session.totalRows,
          importedRows: result.importedRows,
          failedRows: result.failedRows,
          skippedRows: result.skippedRows,
        },
      });

      return result;
    } catch (err: any) {
      session.status = "FAILED";
      session.errorMessage = err.message || "Execution encountered an unexpected database error.";
      await session.save();

      await AuditLog.create({
        userId: authUserId,
        userRole: authUserRole,
        action: "EXCEL_IMPORT_FAILED",
        entityType: "IMPORT_SESSION",
        entityId: session._id.toString(),
        schoolId,
        metadata: {
          importType: session.type,
          fileName: session.fileName,
          error: err.message,
        },
      });

      throw err;
    }
  }

  // --- Students Import ---
  private static async importStudents(
    schoolId: string,
    rows: any[],
    authUserId: string,
    authUserRole: any,
    res: ExecutionResult
  ) {
    for (const item of rows) {
      try {
        const row = item.data;
        const initialHistory = [
          {
            academicYearId: row.academicYearId,
            classId: row.classId,
            sectionId: row.sectionId,
            rollNumber: row.rollNumber || "",
            yearName: row.academicYearName,
            className: row.className,
            sectionName: row.sectionName,
            status: row.status,
            startDate: row.admissionDate,
          },
        ];

        const student = new Student({
          schoolId,
          admissionNumber: row.admissionNumber,
          studentId: row.studentId || row.admissionNumber,
          rollNumber: row.rollNumber || "",
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email || "",
          phone: row.phone || "",
          dateOfBirth: row.dateOfBirth,
          gender: row.gender,
          bloodGroup: row.bloodGroup || "",
          academicYearId: row.academicYearId,
          classId: row.classId,
          sectionId: row.sectionId,
          admissionDate: row.admissionDate,
          status: row.status,
          address: row.address,
          academicHistory: initialHistory,
          createdBy: authUserId,
          updatedBy: authUserId,
        });

        await student.save();

        // Optional Guardian linking during student import
        if (row.parent && row.parent.email) {
          const parentEmail = normalizeEmail(row.parent.email);
          let parentDoc = await Parent.findOne({ schoolId, email: parentEmail });
          if (!parentDoc) {
            const nameParts = row.parent.name.trim().split(" ");
            const pFirst = nameParts[0] || "Guardian";
            const pLast = nameParts.slice(1).join(" ") || row.lastName;

            parentDoc = new Parent({
              schoolId,
              firstName: pFirst,
              lastName: pLast,
              email: parentEmail,
              phone: row.parent.phone || "",
              relationship: row.parent.relationship || "FATHER",
              status: "ACTIVE",
              createdBy: authUserId,
              updatedBy: authUserId,
            });
            await parentDoc.save();
          }

          const link = new StudentParent({
            schoolId,
            studentId: student._id,
            parentId: parentDoc._id,
            relationship: row.parent.relationship || "GUARDIAN",
            isPrimaryGuardian: true,
            isEmergencyContact: true,
            canPickup: true,
            createdBy: authUserId,
            updatedBy: authUserId,
          });
          await link.save();
        }

        res.importedRows++;
      } catch (err: any) {
        res.failedRows++;
        res.errors.push({ rowNumber: item.rowNumber, message: err.message });
      }
    }
  }

  // --- Parents Import ---
  private static async importParents(
    schoolId: string,
    rows: any[],
    authUserId: string,
    authUserRole: any,
    res: ExecutionResult
  ) {
    for (const item of rows) {
      try {
        const row = item.data;
        const parent = new Parent({
          schoolId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          relationship: row.relationship,
          occupation: row.occupation || "",
          status: row.status,
          address: row.address,
          createdBy: authUserId,
          updatedBy: authUserId,
        });

        await parent.save();

        // Link student associations
        if (row.linkedStudentIds && row.linkedStudentIds.length > 0) {
          for (const sId of row.linkedStudentIds) {
            const link = new StudentParent({
              schoolId,
              studentId: sId,
              parentId: parent._id,
              relationship: row.relationship || "GUARDIAN",
              isPrimaryGuardian: true,
              isEmergencyContact: true,
              canPickup: true,
              createdBy: authUserId,
              updatedBy: authUserId,
            });
            await link.save();
          }
        }

        res.importedRows++;
      } catch (err: any) {
        res.failedRows++;
        res.errors.push({ rowNumber: item.rowNumber, message: err.message });
      }
    }
  }

  // --- Teachers Import ---
  private static async importTeachers(
    schoolId: string,
    rows: any[],
    authUserId: string,
    authUserRole: any,
    res: ExecutionResult
  ) {
    for (const item of rows) {
      try {
        const row = item.data;
        const teacher = new Teacher({
          schoolId,
          teacherId: row.teacherId,
          employeeId: row.employeeId || "",
          firstName: row.firstName,
          middleName: row.middleName || "",
          lastName: row.lastName,
          gender: row.gender,
          email: row.email || "",
          phone: row.phone || "",
          department: row.department,
          designation: row.designation,
          qualification: row.qualification,
          joiningDate: row.joiningDate,
          dateOfBirth: row.dateOfBirth,
          status: row.status,
          address: row.address,
          createdBy: authUserId,
          updatedBy: authUserId,
        });

        await teacher.save();
        res.importedRows++;
      } catch (err: any) {
        res.failedRows++;
        res.errors.push({ rowNumber: item.rowNumber, message: err.message });
      }
    }
  }

  // --- Classes Import ---
  private static async importClasses(
    schoolId: string,
    rows: any[],
    authUserId: string,
    authUserRole: any,
    res: ExecutionResult
  ) {
    for (const item of rows) {
      try {
        const row = item.data;
        const cls = new Class({
          schoolId,
          academicYearId: row.academicYearId,
          name: row.name,
          code: row.code || "",
          displayOrder: row.displayOrder || 0,
          isActive: row.isActive,
          createdBy: authUserId,
          updatedBy: authUserId,
        });

        await cls.save();
        res.importedRows++;
      } catch (err: any) {
        res.failedRows++;
        res.errors.push({ rowNumber: item.rowNumber, message: err.message });
      }
    }
  }

  // --- Sections Import ---
  private static async importSections(
    schoolId: string,
    rows: any[],
    authUserId: string,
    authUserRole: any,
    res: ExecutionResult
  ) {
    for (const item of rows) {
      try {
        const row = item.data;
        const section = new Section({
          schoolId,
          academicYearId: row.academicYearId,
          classId: row.classId,
          name: row.name,
          code: row.code || "",
          capacity: row.capacity || 40,
          isActive: row.isActive,
          createdBy: authUserId,
          updatedBy: authUserId,
        });

        await section.save();
        res.importedRows++;
      } catch (err: any) {
        res.failedRows++;
        res.errors.push({ rowNumber: item.rowNumber, message: err.message });
      }
    }
  }

  // --- Fees Import ---
  private static async importFees(
    schoolId: string,
    rows: any[],
    authUserId: string,
    authUserRole: any,
    res: ExecutionResult
  ) {
    for (const item of rows) {
      try {
        const row = item.data;

        // Ensure student fee account exists
        let feeAccount = await StudentFeeAccount.findOne({
          schoolId,
          studentId: row.studentId,
          academicYearId: row.academicYearId,
        });

        if (!feeAccount) {
          feeAccount = new StudentFeeAccount({
            schoolId,
            studentId: row.studentId,
            academicYearId: row.academicYearId,
            totalFee: row.amount,
            netFee: row.amount,
            paidAmount: row.amount,
            pendingAmount: 0,
            status: "PAID",
          });
          await feeAccount.save();
        } else {
          feeAccount.paidAmount = (feeAccount.paidAmount || 0) + row.amount;
          feeAccount.pendingAmount = Math.max(0, (feeAccount.netFee || feeAccount.totalFee || 0) - feeAccount.paidAmount);
          feeAccount.status = feeAccount.pendingAmount === 0 ? "PAID" : "PARTIALLY_PAID";
          await feeAccount.save();
        }

        const payment = new FeePayment({
          schoolId,
          academicYearId: row.academicYearId,
          studentId: row.studentId,
          feeAccountId: feeAccount._id,
          amount: row.amount,
          paymentDate: row.paymentDate,
          paymentMethod: row.paymentMethod,
          receiptNumber: row.receiptNumber,
          transactionId: row.transactionId || "",
          remarks: row.remarks || "",
          status: "ACTIVE",
          recordedBy: authUserId,
        });

        await payment.save();
        res.importedRows++;
      } catch (err: any) {
        res.failedRows++;
        res.errors.push({ rowNumber: item.rowNumber, message: err.message });
      }
    }
  }
}
