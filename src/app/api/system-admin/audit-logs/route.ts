import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { auditLogQuerySchema } from "@/lib/validation/audit";

export async function GET(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const queryResult = auditLogQuerySchema.safeParse({
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 25,
      search: url.searchParams.get("search") || "",
      action: url.searchParams.get("action") || "ALL",
      entityType: url.searchParams.get("entityType") || "ALL",
      schoolId: url.searchParams.get("schoolId") || undefined,
      userId: url.searchParams.get("userId") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      sortBy: url.searchParams.get("sortBy") || "createdAt",
      sortOrder: url.searchParams.get("sortOrder") || "desc",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters.",
            details: queryResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      action,
      entityType,
      schoolId,
      userId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = queryResult.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (action !== "ALL") {
      filter.action = action;
    }

    if (entityType !== "ALL") {
      filter.entityType = entityType;
    }

    if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
      filter.schoolId = new mongoose.Types.ObjectId(schoolId);
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: "i" } },
        { entityType: { $regex: search, $options: "i" } },
        { entityId: { $regex: search, $options: "i" } },
      ];
    }

    const sortOption: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const skip = (page - 1) * limit;

    const [logs, totalLogs] = await Promise.all([
      AuditLog.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email role")
        .populate("schoolId", "name code")
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const sanitizedLogs = logs.map((log) => {
      // Guaranteed clean metadata without sensitive properties
      const safeMeta: Record<string, unknown> = {};
      if (log.metadata && typeof log.metadata === "object") {
        for (const [k, v] of Object.entries(log.metadata)) {
          if (!/password|token|secret|jwt|hash/i.test(k)) {
            safeMeta[k] = v;
          }
        }
      }

      return {
        id: log._id.toString(),
        actor: log.userId
          ? {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              id: (log.userId as any)._id?.toString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: (log.userId as any).name,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              email: (log.userId as any).email,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              role: (log.userId as any).role || log.userRole,
            }
          : {
              role: log.userRole,
              name: "System Worker",
            },
        userRole: log.userRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        school: log.schoolId
          ? {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              id: (log.schoolId as any)._id?.toString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: (log.schoolId as any).name,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              code: (log.schoolId as any).code,
            }
          : null,
        metadata: safeMeta,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        logs: sanitizedLogs,
        pagination: {
          total: totalLogs,
          page,
          limit,
          totalPages: Math.ceil(totalLogs / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/system-admin/audit-logs error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to query audit logs.",
        },
      },
      { status: 500 }
    );
  }
}
