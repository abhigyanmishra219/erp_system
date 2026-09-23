import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import FeePayment from "@/models/FeePayment";
import AcademicYear from "@/models/AcademicYear";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { searchParams } = new URL(req.url);

  const academicYearId = searchParams.get("academicYearId");

  try {
    await connectToDatabase();

    let targetYearId = academicYearId;
    if (!targetYearId || !mongoose.Types.ObjectId.isValid(targetYearId)) {
      const activeYear = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
      if (activeYear) targetYearId = activeYear._id.toString();
    }

    const sId = new mongoose.Types.ObjectId(schoolId);
    const filter: Record<string, any> = { schoolId: sId };
    if (targetYearId && mongoose.Types.ObjectId.isValid(targetYearId)) {
      filter.academicYearId = new mongoose.Types.ObjectId(targetYearId);
    }

    const [accountsAggregation, paymentsAggregation, statusCounts] = await Promise.all([
      StudentFeeAccount.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAssigned: { $sum: "$totalFee" },
            totalDiscount: { $sum: "$discountAmount" },
            totalConcession: { $sum: "$concessionAmount" },
            totalNetFee: { $sum: "$netFee" },
            totalPaid: { $sum: "$paidAmount" },
            totalPending: { $sum: "$pendingAmount" },
            totalLateFee: { $sum: "$lateFeeAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
      FeePayment.aggregate([
        { $match: { ...filter, status: "ACTIVE" } },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: "$amount" },
            paymentCount: { $sum: 1 },
          },
        },
      ]),
      StudentFeeAccount.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$pendingAmount" } } },
      ]),
    ]);

    const accSummary = accountsAggregation[0] || {
      totalAssigned: 0,
      totalDiscount: 0,
      totalConcession: 0,
      totalNetFee: 0,
      totalPaid: 0,
      totalPending: 0,
      totalLateFee: 0,
      count: 0,
    };

    const paySummary = paymentsAggregation[0] || {
      totalCollected: 0,
      paymentCount: 0,
    };

    const statusMap: Record<string, { count: number; amount: number }> = {
      PAID: { count: 0, amount: 0 },
      PARTIALLY_PAID: { count: 0, amount: 0 },
      PENDING: { count: 0, amount: 0 },
      OVERDUE: { count: 0, amount: 0 },
    };

    statusCounts.forEach((sc) => {
      if (statusMap[sc._id]) {
        statusMap[sc._id] = { count: sc.count, amount: sc.amount };
      }
    });

    const collectionRate =
      accSummary.totalNetFee > 0
        ? Math.round((paySummary.totalCollected / accSummary.totalNetFee) * 1000) / 10
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalAssigned: accSummary.totalAssigned,
        totalDiscount: accSummary.totalDiscount,
        totalConcession: accSummary.totalConcession,
        totalNetFee: accSummary.totalNetFee,
        totalCollected: paySummary.totalCollected,
        totalPending: accSummary.totalPending,
        totalOverdue: statusMap.OVERDUE.amount,
        collectionRate,
        studentCount: accSummary.count,
        paymentCount: paySummary.paymentCount,
        statusBreakdown: statusMap,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch fee statistics" } },
      { status: 500 }
    );
  }
}
