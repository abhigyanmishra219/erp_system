import mongoose from "mongoose";
import StudentFeeAccount, { IStudentFeeAccount, FeeAccountStatus } from "@/models/StudentFeeAccount";
import StudentFeeAssignment, { IStudentFeeAssignment } from "@/models/StudentFeeAssignment";
import FeePayment, { IFeePayment } from "@/models/FeePayment";
import School from "@/models/School";
import { FeeCalculationService } from "./feeCalculationService";

export class FeeAccountCalculationService {
  /**
   * Recalculates and persists a student's fee account summary from all active assignments & payments
   */
  static async recalculateStudentFeeAccount(
    schoolId: mongoose.Types.ObjectId | string,
    academicYearId: mongoose.Types.ObjectId | string,
    studentId: mongoose.Types.ObjectId | string,
    asOfDate: Date = new Date()
  ): Promise<IStudentFeeAccount> {
    const sId = new mongoose.Types.ObjectId(schoolId.toString());
    const ayId = new mongoose.Types.ObjectId(academicYearId.toString());
    const stuId = new mongoose.Types.ObjectId(studentId.toString());

    // 1. Fetch all active assignments and valid payments
    const [assignments, payments, schoolDoc] = await Promise.all([
      StudentFeeAssignment.find({
        schoolId: sId,
        academicYearId: ayId,
        studentId: stuId,
        status: "ACTIVE",
      }).sort({ createdAt: 1 }),
      FeePayment.find({
        schoolId: sId,
        academicYearId: ayId,
        studentId: stuId,
        status: "ACTIVE",
      }).sort({ paymentDate: 1, createdAt: 1 }),
      School.findById(sId).lean(),
    ]);

    // 2. Compute gross, discounts, concessions, net fee
    let totalFee = 0;
    let discountAmount = 0;
    let concessionAmount = 0;
    let netFee = 0;

    for (const assign of assignments) {
      totalFee += assign.baseAmount || 0;
      discountAmount += assign.discountAmount || 0;
      concessionAmount += assign.concessionAmount || 0;
      netFee += assign.netAmount || 0;
    }

    totalFee = Math.round(totalFee * 100) / 100;
    discountAmount = Math.round(discountAmount * 100) / 100;
    concessionAmount = Math.round(concessionAmount * 100) / 100;
    netFee = Math.round(netFee * 100) / 100;

    // 3. Compute total paid amount
    const paidAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const roundedPaidAmount = Math.round(paidAmount * 100) / 100;

    // 4. Distribute paid amount across installment due schedules
    let remainingPaymentToAllocate = roundedPaidAmount;

    // Flatten all installments across assignments sorted by dueDate
    interface FlatInstallment {
      assignmentIndex: number;
      installmentIndex: number;
      name: string;
      amount: number;
      dueDate: Date;
      sequence: number;
      paidAmount: number;
      status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
    }

    const allInstallments: FlatInstallment[] = [];

    assignments.forEach((assign, aIdx) => {
      (assign.dueSchedule || []).forEach((inst, iIdx) => {
        allInstallments.push({
          assignmentIndex: aIdx,
          installmentIndex: iIdx,
          name: inst.name,
          amount: inst.amount,
          dueDate: new Date(inst.dueDate),
          sequence: inst.sequence,
          paidAmount: 0,
          status: "UNPAID",
        });
      });
    });

    // Sort chronologically by due date, then sequence
    allInstallments.sort((a, b) => {
      const diff = a.dueDate.getTime() - b.dueDate.getTime();
      return diff !== 0 ? diff : a.sequence - b.sequence;
    });

    // Allocate payment
    for (const inst of allInstallments) {
      if (remainingPaymentToAllocate <= 0) {
        inst.paidAmount = 0;
        inst.status = "UNPAID";
      } else if (remainingPaymentToAllocate >= inst.amount) {
        inst.paidAmount = inst.amount;
        inst.status = "PAID";
        remainingPaymentToAllocate -= inst.amount;
      } else {
        inst.paidAmount = Math.round(remainingPaymentToAllocate * 100) / 100;
        inst.status = "PARTIALLY_PAID";
        remainingPaymentToAllocate = 0;
      }
    }

    // Save updated installment schedules back to assignments
    for (let aIdx = 0; aIdx < assignments.length; aIdx++) {
      const assign = assignments[aIdx];
      const matching = allInstallments.filter((item) => item.assignmentIndex === aIdx);
      let isModified = false;

      matching.forEach((m) => {
        if (assign.dueSchedule[m.installmentIndex]) {
          assign.dueSchedule[m.installmentIndex].paidAmount = m.paidAmount;
          assign.dueSchedule[m.installmentIndex].status = m.status;
          isModified = true;
        }
      });

      if (isModified) {
        await assign.save();
      }
    }

    // 5. Calculate pending, next due amount and next due date
    const pendingAmount = Math.max(0, Math.round((netFee - roundedPaidAmount) * 100) / 100);

    // Find earliest unpaid or partially paid installment
    const nextUnpaidInstallment = allInstallments.find(
      (inst) => inst.status === "UNPAID" || inst.status === "PARTIALLY_PAID"
    );

    let nextDueAmount = 0;
    let nextDueDate: Date | null = null;
    let isAnyOverdue = false;

    if (nextUnpaidInstallment) {
      nextDueAmount = Math.round((nextUnpaidInstallment.amount - nextUnpaidInstallment.paidAmount) * 100) / 100;
      nextDueDate = nextUnpaidInstallment.dueDate;
    } else if (pendingAmount > 0) {
      nextDueAmount = pendingAmount;
    }

    // Check if any unpaid installment has passed its due date
    const now = asOfDate.getTime();
    for (const inst of allInstallments) {
      if (inst.status !== "PAID" && inst.dueDate.getTime() < now) {
        isAnyOverdue = true;
        break;
      }
    }

    // 6. Calculate late fee if overdue
    let lateFeeAmount = 0;
    if (isAnyOverdue && nextDueDate && schoolDoc?.feeSettings) {
      lateFeeAmount = FeeCalculationService.calculateLateFee(
        pendingAmount,
        nextDueDate,
        schoolDoc.feeSettings,
        asOfDate
      );
    }

    // 7. Determine account financial status
    let status: FeeAccountStatus = "PENDING";
    if (assignments.length === 0) {
      status = "PENDING";
    } else if (pendingAmount === 0 && netFee >= 0) {
      status = "PAID";
    } else if (roundedPaidAmount > 0 && pendingAmount > 0) {
      status = isAnyOverdue ? "OVERDUE" : "PARTIALLY_PAID";
    } else if (roundedPaidAmount === 0 && isAnyOverdue) {
      status = "OVERDUE";
    } else {
      status = "PENDING";
    }

    // 8. Atomic Upsert StudentFeeAccount
    const updatedAccount = await StudentFeeAccount.findOneAndUpdate(
      {
        schoolId: sId,
        academicYearId: ayId,
        studentId: stuId,
      },
      {
        totalFee,
        discountAmount,
        concessionAmount,
        netFee,
        paidAmount: roundedPaidAmount,
        pendingAmount,
        lateFeeAmount,
        nextDueAmount,
        nextDueDate,
        status,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return updatedAccount;
  }
}
