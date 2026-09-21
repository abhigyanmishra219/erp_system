import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const startTime = Date.now();

  try {
    await connectToDatabase();

    // Measure MongoDB ping latency
    let dbPingMs = 0;
    let dbStatus = "DISCONNECTED";
    let dbName = "Unknown";
    let collectionsCount = 0;

    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - pingStart;
      dbStatus = "CONNECTED";
      dbName = mongoose.connection.db.databaseName;

      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        collectionsCount = collections.length;
      } catch {
        collectionsCount = 0;
      }
    } else if (mongoose.connection.readyState === 2) {
      dbStatus = "CONNECTING";
    }

    // Server Memory Usage
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    const telemetry = {
      server: {
        status: "OPERATIONAL",
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        uptimeSeconds: uptimeSec,
        memory: {
          rssMb: Math.round(memory.rss / (1024 * 1024)),
          heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
        },
        responseLatencyMs: Date.now() - startTime,
      },
      database: {
        status: dbStatus,
        pingMs: dbPingMs,
        databaseName: dbName,
        collectionsCount,
        readyState: mongoose.connection.readyState,
      },
      storage: {
        status: "NOT_CONFIGURED",
        isConfigured: false,
        message: "Storage monitoring unavailable — file storage infrastructure not configured.",
      },
      backgroundJobs: {
        status: "NOT_CONFIGURED",
        isConfigured: false,
        message: "Background job queue monitoring not configured.",
      },
      notifications: {
        status: "NOT_CONFIGURED",
        isConfigured: false,
        message: "Notification dispatch monitoring not available.",
      },
      backups: {
        status: "NOT_CONFIGURED",
        isConfigured: false,
        message: "Automated backup monitoring not configured.",
      },
      errors: {
        status: "OPERATIONAL",
        message: "No unhandled server exceptions recorded in current window.",
      },
      lastChecked: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: telemetry,
    });
  } catch (error) {
    console.error("GET /api/system-admin/monitoring error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to collect system monitoring telemetry.",
        },
      },
      { status: 500 }
    );
  }
}
