import { NextRequest, NextResponse } from "next/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import School from "@/models/School";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    await connectToDatabase();

    // 1. Compute School Statistics from MongoDB
    const [
      totalSchools,
      activeSchools,
      inactiveSchools,
      suspendedSchools,
      trialSchools,
      expiredSchools,
      recentSchools,
    ] = await Promise.all([
      School.countDocuments({ isDeleted: false }),
      School.countDocuments({ isDeleted: false, status: "ACTIVE" }),
      School.countDocuments({ isDeleted: false, status: "INACTIVE" }),
      School.countDocuments({ isDeleted: false, status: "SUSPENDED" }),
      School.countDocuments({ isDeleted: false, subscriptionStatus: "TRIAL" }),
      School.countDocuments({ isDeleted: false, subscriptionStatus: "EXPIRED" }),
      School.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name code plan status subscriptionStatus studentLimit createdAt")
        .lean(),
    ]);

    // 2. Compute User Statistics from MongoDB
    const [
      totalUsers,
      activeUsers,
      systemAdminsCount,
      adminsCount,
      teachersCount,
      studentsCount,
      parentsCount,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "SYSTEM_ADMIN" }),
      User.countDocuments({ role: "ADMIN" }),
      User.countDocuments({ role: "TEACHER" }),
      User.countDocuments({ role: "STUDENT" }),
      User.countDocuments({ role: "PARENT" }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        schools: {
          total: totalSchools,
          active: activeSchools,
          inactive: inactiveSchools,
          suspended: suspendedSchools,
          trial: trialSchools,
          expired: expiredSchools,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          systemAdmins: systemAdminsCount,
          admins: adminsCount,
        },
        students: {
          total: studentsCount,
          note: "Platform student accounts (Module implementation in future phase)",
        },
        teachers: {
          total: teachersCount,
          note: "Platform teacher accounts (Module implementation in future phase)",
        },
        parents: {
          total: parentsCount,
          note: "Platform parent accounts (Module implementation in future phase)",
        },
        storage: {
          totalBytes: 0,
          formatted: "0 MB",
          note: "Storage telemetry not configured in Phase 1",
        },
        supportRequests: {
          total: 0,
          open: 0,
          note: "Support module not configured in Phase 1",
        },
        recentSchools: recentSchools.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          code: s.code,
          plan: s.plan,
          status: s.status,
          subscriptionStatus: s.subscriptionStatus,
          studentLimit: s.studentLimit,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("Dashboard statistics error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load dashboard statistics";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DASHBOARD_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
