import { FeeFrequency, IFeeStructure } from "@/models/FeeStructure";
import { FeeReductionType, IScheduledInstallment } from "@/models/StudentFeeAssignment";

export interface FeeCalculationResult {
  baseAmount: number;
  discountAmount: number;
  concessionAmount: number;
  netAmount: number;
  dueSchedule: IScheduledInstallment[];
}

export class FeeCalculationService {
  /**
   * Calculates discount amount based on discount type and value
   */
  static calculateDiscount(
    baseAmount: number,
    type: FeeReductionType,
    value: number
  ): number {
    if (type === "NONE" || !value || value <= 0 || baseAmount <= 0) return 0;
    if (type === "FIXED") {
      return Math.min(baseAmount, Math.round(value * 100) / 100);
    }
    if (type === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, value));
      return Math.round(((baseAmount * pct) / 100) * 100) / 100;
    }
    return 0;
  }

  /**
   * Calculates concession amount based on amount after discount
   */
  static calculateConcession(
    amountAfterDiscount: number,
    type: FeeReductionType,
    value: number
  ): number {
    if (type === "NONE" || !value || value <= 0 || amountAfterDiscount <= 0) return 0;
    if (type === "FIXED") {
      return Math.min(amountAfterDiscount, Math.round(value * 100) / 100);
    }
    if (type === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, value));
      return Math.round(((amountAfterDiscount * pct) / 100) * 100) / 100;
    }
    return 0;
  }

  /**
   * Builds an installment payment schedule scaled to the student's net payable amount
   */
  static generateDueSchedule(
    structure: IFeeStructure,
    netAmount: number,
    effectiveStartDate?: Date
  ): IScheduledInstallment[] {
    const baseDate = effectiveStartDate || structure.effectiveFrom || new Date();
    const year = baseDate.getFullYear();

    // 1. If explicit installments exist on structure
    if (structure.frequency === "INSTALLMENT" && structure.installments && structure.installments.length > 0) {
      const totalBase = structure.installments.reduce((acc, curr) => acc + curr.amount, 0) || structure.amount;
      const ratio = totalBase > 0 ? netAmount / totalBase : 1;

      let accumulated = 0;
      return structure.installments.map((inst, index) => {
        const isLast = index === structure.installments.length - 1;
        const installmentAmount = isLast
          ? Math.round((netAmount - accumulated) * 100) / 100
          : Math.round(inst.amount * ratio * 100) / 100;

        accumulated += installmentAmount;

        return {
          name: inst.name,
          amount: Math.max(0, installmentAmount),
          dueDate: new Date(inst.dueDate),
          sequence: inst.sequence || index + 1,
          paidAmount: 0,
          status: "UNPAID",
        };
      });
    }

    // 2. Frequency-based automatic generation
    let parts = 1;
    const names: string[] = [];
    const dates: Date[] = [];

    switch (structure.frequency) {
      case "MONTHLY":
        parts = 12;
        for (let i = 0; i < 12; i++) {
          const d = new Date(year, (baseDate.getMonth() + i) % 12, 10);
          if (baseDate.getMonth() + i >= 12) d.setFullYear(year + 1);
          names.push(d.toLocaleString("default", { month: "long" }) + " Fee");
          dates.push(d);
        }
        break;

      case "QUARTERLY":
        parts = 4;
        names.push("Quarter 1 (Apr-Jun)", "Quarter 2 (Jul-Sep)", "Quarter 3 (Oct-Dec)", "Quarter 4 (Jan-Mar)");
        dates.push(
          new Date(year, 3, 10),
          new Date(year, 6, 10),
          new Date(year, 9, 10),
          new Date(year + 1, 0, 10)
        );
        break;

      case "HALF_YEARLY":
        parts = 2;
        names.push("Term 1 Fee", "Term 2 Fee");
        dates.push(new Date(year, 3, 10), new Date(year, 9, 10));
        break;

      case "ANNUAL":
      default:
        parts = 1;
        names.push("Annual Fee");
        dates.push(new Date(year, 3, 10));
        break;
    }

    const standardPartAmount = Math.floor((netAmount / parts) * 100) / 100;
    let runningTotal = 0;

    return names.map((name, i) => {
      const isLast = i === parts - 1;
      const amt = isLast ? Math.round((netAmount - runningTotal) * 100) / 100 : standardPartAmount;
      runningTotal += amt;

      return {
        name,
        amount: Math.max(0, amt),
        dueDate: dates[i] || new Date(),
        sequence: i + 1,
        paidAmount: 0,
        status: "UNPAID",
      };
    });
  }

  /**
   * Computes the complete net fee and schedule for a student fee assignment
   */
  static calculateAssignment(
    structure: IFeeStructure,
    discountType: FeeReductionType = "NONE",
    discountValue: number = 0,
    concessionType: FeeReductionType = "NONE",
    concessionValue: number = 0
  ): FeeCalculationResult {
    const baseAmount = structure.amount;
    const discountAmount = this.calculateDiscount(baseAmount, discountType, discountValue);
    const amountAfterDiscount = Math.max(0, baseAmount - discountAmount);
    const concessionAmount = this.calculateConcession(amountAfterDiscount, concessionType, concessionValue);
    const netAmount = Math.max(0, Math.round((amountAfterDiscount - concessionAmount) * 100) / 100);

    const dueSchedule = this.generateDueSchedule(structure, netAmount);

    return {
      baseAmount,
      discountAmount,
      concessionAmount,
      netAmount,
      dueSchedule,
    };
  }

  /**
   * Determines deterministic late fee amount based on school settings and overdue days
   */
  static calculateLateFee(
    overdueAmount: number,
    dueDate: Date,
    lateFeeSettings?: {
      lateFeeGraceDays?: number;
      lateFeeFineAmount?: number;
      lateFeeType?: "FIXED" | "PERCENTAGE";
    },
    asOfDate: Date = new Date()
  ): number {
    if (!lateFeeSettings || overdueAmount <= 0) return 0;

    const graceDays = lateFeeSettings.lateFeeGraceDays ?? 7;
    const fineAmount = lateFeeSettings.lateFeeFineAmount ?? 100;
    const fineType = lateFeeSettings.lateFeeType || "FIXED";

    const dueTime = new Date(dueDate).getTime();
    const currentTime = new Date(asOfDate).getTime();
    const graceMs = graceDays * 24 * 60 * 60 * 1000;

    if (currentTime <= dueTime + graceMs) {
      return 0; // Within grace period
    }

    if (fineType === "PERCENTAGE") {
      return Math.round(((overdueAmount * fineAmount) / 100) * 100) / 100;
    }

    return fineAmount;
  }
}
