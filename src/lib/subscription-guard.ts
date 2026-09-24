import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import School, { ISchool } from "@/models/School";
import Student from "@/models/Student";
import {
  ERP_MODULES,
  SchoolModule,
  SchoolSubscriptionLike,
  EffectiveSubscription,
  getEffectiveSubscriptionStatus,
} from "./subscription";

export * from "./subscription";

export type RequireModuleResult =
  | { allowed: true; response?: undefined }
  | { allowed: false; response: NextResponse };

/**
 * Server-side guard to verify subscription and module access.
 * Returns { allowed: true } if permitted, or { allowed: false, response: NextResponse } with HTTP 403/404 if access is denied.
 */
export function requireModule(
  school: SchoolSubscriptionLike | Partial<ISchool> | null | undefined,
  moduleName: SchoolModule
): RequireModuleResult {
  if (!school || school.isDeleted) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "SCHOOL_NOT_FOUND",
          message: "The school institution record could not be found or has been archived.",
        },
        { status: 404 }
      ),
    };
  }

  if (school.status === "SUSPENDED") {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "SCHOOL_SUSPENDED",
          message: "Access to this school ERP instance has been suspended. Please contact platform support.",
        },
        { status: 403 }
      ),
    };
  }

  if (school.status === "INACTIVE") {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "SCHOOL_INACTIVE",
          message: "This school institution is currently marked inactive.",
        },
        { status: 403 }
      ),
    };
  }

  const effectiveStatus = getEffectiveSubscriptionStatus(school);

  if (effectiveStatus === "SUSPENDED") {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "SUBSCRIPTION_SUSPENDED",
          message: "Your school's ERP subscription is currently suspended. Please contact platform support.",
        },
        { status: 403 }
      ),
    };
  }

  if (effectiveStatus === "CANCELLED") {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "SUBSCRIPTION_CANCELLED",
          message: "Your school's ERP subscription has been cancelled.",
        },
        { status: 403 }
      ),
    };
  }

  if (effectiveStatus === "EXPIRED") {
    const expiryStr = school.subscriptionExpiryDate
      ? new Date(school.subscriptionExpiryDate).toLocaleDateString()
      : "earlier";
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "SUBSCRIPTION_EXPIRED",
          message: `Your school's subscription expired on ${expiryStr}. Please renew your subscription to access this module.`,
        },
        { status: 403 }
      ),
    };
  }

  // Verify module entitlement
  if (!school.enabledModules || !school.enabledModules.includes(moduleName)) {
    const moduleLabel = ERP_MODULES[moduleName]?.label || moduleName;
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: "MODULE_NOT_INCLUDED",
          message: `${moduleLabel} is not included in the current subscription plan.`,
          module: moduleName,
        },
        { status: 403 }
      ),
    };
  }

  return { allowed: true };
}

/**
 * Checks whether the school has capacity to add `countToAdd` active students.
 */
export async function checkStudentCapacity(
  schoolId: string,
  countToAdd: number = 1
): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  errorResponse?: NextResponse;
}> {
  await connectToDatabase();

  const school = await School.findById(schoolId).lean();
  if (!school || school.isDeleted) {
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      remaining: 0,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "SCHOOL_NOT_FOUND",
          message: "School record not found or has been archived.",
        },
        { status: 404 }
      ),
    };
  }

  // Count active students only
  const currentCount = await Student.countDocuments({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    status: "ACTIVE",
  });

  const limit = school.studentLimit || 200;
  const remaining = Math.max(0, limit - currentCount);

  if (currentCount + countToAdd > limit) {
    return {
      allowed: false,
      currentCount,
      limit,
      remaining,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "STUDENT_LIMIT_REACHED",
          message: `Your current subscription allows a maximum of ${limit} students. Current active students: ${currentCount}.`,
          limit,
          current: currentCount,
          available: remaining,
          requested: countToAdd,
        },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    currentCount,
    limit,
    remaining,
  };
}

/**
 * Loads complete subscription details and active telemetry for a school.
 */
export async function getSubscriptionDetails(
  schoolId: string
): Promise<EffectiveSubscription | null> {
  await connectToDatabase();

  const school = await School.findById(schoolId).lean();
  if (!school || school.isDeleted) return null;

  const currentStudents = await Student.countDocuments({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    status: "ACTIVE",
  });

  const effectiveStatus = getEffectiveSubscriptionStatus(school);
  const isActive = effectiveStatus === "ACTIVE" || effectiveStatus === "TRIAL";
  const isExpired = effectiveStatus === "EXPIRED";
  const isSuspended = effectiveStatus === "SUSPENDED";

  const maxStudents = school.studentLimit || 200;
  const remainingStudentSlots = Math.max(0, maxStudents - currentStudents);

  let daysRemaining = 0;
  if (school.subscriptionExpiryDate) {
    const diff = new Date(school.subscriptionExpiryDate).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return {
    planName: school.plan || "BASIC",
    planCode: (school.plan || "BASIC").toUpperCase(),
    status: school.subscriptionStatus || "TRIAL",
    effectiveStatus,
    isActive,
    isExpired,
    isSuspended,
    maxStudents,
    currentStudents,
    remainingStudentSlots,
    storageLimit: (school as any).storageLimit || 5120,
    maxAdmins: (school as any).maxAdmins || 2,
    enabledModules: (school.enabledModules as SchoolModule[]) || [],
    startDate: school.subscriptionStartDate
      ? new Date(school.subscriptionStartDate).toISOString()
      : null,
    expiryDate: school.subscriptionExpiryDate
      ? new Date(school.subscriptionExpiryDate).toISOString()
      : null,
    daysRemaining,
  };
}
