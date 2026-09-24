import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { getSubscriptionDetails } from "@/lib/subscription-guard";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const details = await getSubscriptionDetails(schoolId);
    if (!details) {
      return NextResponse.json(
        { success: false, error: "SCHOOL_NOT_FOUND", message: "School record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: details,
    });
  } catch (err: any) {
    console.error("GET /api/admin/subscription error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Failed to fetch subscription data" },
      { status: 500 }
    );
  }
}
