import mongoose from "mongoose";
import LeaveRequest, { ILeaveRequest, LeaveApplicantRole, LeaveStatus } from "@/models/LeaveRequest";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import Notification from "@/models/Notification";
import AuditLog from "@/models/AuditLog";
import { UserRole } from "@/lib/constants/roles";

export interface SubmitLeaveParams {
  schoolId: string;
  applicantUserId: string;
  applicantRole: LeaveApplicantRole;
  studentId?: string | null;
  teacherId?: string | null;
  fromDate: Date;
  toDate: Date;
  reason: string;
  attachments?: { name: string; url: string; mimeType?: string; size?: number }[];
}

export class LeaveService {
  /**
   * Check if an active (PENDING or APPROVED) leave request already exists in the requested date interval
   */
  static async checkLeaveOverlap(
    schoolId: string,
    target: { studentId?: string | null; teacherId?: string | null; applicantUserId: string },
    fromDate: Date,
    toDate: Date,
    excludeLeaveId?: string
  ): Promise<boolean> {
    const query: any = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      status: { $in: ["PENDING", "APPROVED"] },
      isActive: true,
      fromDate: { $lte: toDate },
      toDate: { $gte: fromDate },
    };

    if (excludeLeaveId && mongoose.Types.ObjectId.isValid(excludeLeaveId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeLeaveId) };
    }

    if (target.studentId) {
      query.studentId = new mongoose.Types.ObjectId(target.studentId);
    } else if (target.teacherId) {
      query.teacherId = new mongoose.Types.ObjectId(target.teacherId);
    } else {
      query.applicantUserId = new mongoose.Types.ObjectId(target.applicantUserId);
    }

    const existing = await LeaveRequest.findOne(query).lean();
    return !!existing;
  }

  /**
   * Submit a new leave request with role-specific verification
   */
  static async submitLeave(params: SubmitLeaveParams): Promise<ILeaveRequest> {
    const {
      schoolId,
      applicantUserId,
      applicantRole,
      studentId,
      teacherId,
      fromDate,
      toDate,
      reason,
      attachments = [],
    } = params;

    // 1. Role-specific validation
    if (applicantRole === "STUDENT") {
      if (!studentId) throw new Error("Student ID is required for student leave");
      const student = await Student.findOne({
        _id: studentId,
        schoolId: new mongoose.Types.ObjectId(schoolId),
        isActive: true,
      }).lean();
      if (!student) throw new Error("Student record not found in this school");
    } else if (applicantRole === "PARENT") {
      if (!studentId) throw new Error("Student selection is required for parent leave");
      const student = await Student.findOne({
        _id: studentId,
        schoolId: new mongoose.Types.ObjectId(schoolId),
        isActive: true,
      }).lean();
      if (!student) throw new Error("Selected student not found in this school");

      // Verify parent link
      const parentDoc = await Parent.findOne({
        userId: new mongoose.Types.ObjectId(applicantUserId),
        schoolId: new mongoose.Types.ObjectId(schoolId),
      }).lean();

      if (parentDoc) {
        const link = await StudentParent.findOne({
          schoolId: new mongoose.Types.ObjectId(schoolId),
          parentId: parentDoc._id,
          studentId: new mongoose.Types.ObjectId(studentId),
        }).lean();

        if (!link) {
          throw new Error("You are not authorized to submit leave for this student");
        }
      }
    } else if (applicantRole === "TEACHER") {
      if (!teacherId) throw new Error("Teacher ID is required for teacher leave");
      const teacher = await Teacher.findOne({
        _id: teacherId,
        schoolId: new mongoose.Types.ObjectId(schoolId),
        isActive: true,
      }).lean();
      if (!teacher) throw new Error("Teacher record not found in this school");
    }

    // 2. Check overlap
    const hasOverlap = await this.checkLeaveOverlap(
      schoolId,
      { studentId, teacherId, applicantUserId },
      fromDate,
      toDate
    );

    if (hasOverlap) {
      throw new Error("An active or pending leave request already covers part of this date range");
    }

    // 3. Create Leave Request
    const leaveRequest = await LeaveRequest.create({
      schoolId,
      applicantUserId,
      applicantRole,
      studentId: studentId ? new mongoose.Types.ObjectId(studentId) : null,
      teacherId: teacherId ? new mongoose.Types.ObjectId(teacherId) : null,
      fromDate,
      toDate,
      reason,
      attachments,
      status: "PENDING",
    });

    return leaveRequest;
  }

  /**
   * Approve a pending leave request
   */
  static async approveLeave(
    schoolId: string,
    leaveId: string,
    reviewerUserId: string,
    reviewerRole: UserRole
  ): Promise<ILeaveRequest> {
    const leave = await LeaveRequest.findOne({
      _id: leaveId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isActive: true,
    });

    if (!leave) {
      throw new Error("Leave request not found");
    }

    if (leave.status !== "PENDING") {
      throw new Error(`Cannot approve a leave request that is already ${leave.status.toLowerCase()}`);
    }

    leave.status = "APPROVED";
    leave.reviewedBy = new mongoose.Types.ObjectId(reviewerUserId);
    leave.reviewedAt = new Date();
    await leave.save();

    // Dispatch In-App Notification to Applicant
    try {
      const fromFormatted = leave.fromDate.toISOString().split("T")[0];
      const toFormatted = leave.toDate.toISOString().split("T")[0];
      await Notification.create({
        schoolId,
        recipientUserId: leave.applicantUserId,
        type: "LEAVE",
        title: "Leave Request Approved",
        message: `Your leave request for ${fromFormatted} to ${toFormatted} has been approved.`,
        referenceType: "LEAVE",
        referenceId: leave._id.toString(),
        actionUrl: `/admin/leaves/${leave._id.toString()}`,
      });
    } catch (notifErr) {
      console.error("Failed to deliver leave approved notification:", notifErr);
    }

    // Audit Log
    await AuditLog.create({
      userId: reviewerUserId,
      userRole: reviewerRole,
      action: "LEAVE_APPROVED",
      entityType: "LEAVE",
      entityId: leave._id.toString(),
      schoolId,
      metadata: {
        leaveId: leave._id.toString(),
        applicantRole: leave.applicantRole,
        studentId: leave.studentId?.toString(),
        teacherId: leave.teacherId?.toString(),
        fromDate: leave.fromDate,
        toDate: leave.toDate,
      },
    });

    return leave;
  }

  /**
   * Reject a pending leave request
   */
  static async rejectLeave(
    schoolId: string,
    leaveId: string,
    reviewerUserId: string,
    reviewerRole: UserRole,
    rejectionReason: string
  ): Promise<ILeaveRequest> {
    const leave = await LeaveRequest.findOne({
      _id: leaveId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isActive: true,
    });

    if (!leave) {
      throw new Error("Leave request not found");
    }

    if (leave.status !== "PENDING") {
      throw new Error(`Cannot reject a leave request that is already ${leave.status.toLowerCase()}`);
    }

    leave.status = "REJECTED";
    leave.reviewedBy = new mongoose.Types.ObjectId(reviewerUserId);
    leave.reviewedAt = new Date();
    leave.rejectionReason = rejectionReason;
    await leave.save();

    // Dispatch In-App Notification to Applicant
    try {
      const fromFormatted = leave.fromDate.toISOString().split("T")[0];
      const toFormatted = leave.toDate.toISOString().split("T")[0];
      await Notification.create({
        schoolId,
        recipientUserId: leave.applicantUserId,
        type: "LEAVE",
        title: "Leave Request Rejected",
        message: `Your leave request for ${fromFormatted} to ${toFormatted} was rejected. Reason: ${rejectionReason}`,
        referenceType: "LEAVE",
        referenceId: leave._id.toString(),
        actionUrl: `/admin/leaves/${leave._id.toString()}`,
      });
    } catch (notifErr) {
      console.error("Failed to deliver leave rejected notification:", notifErr);
    }

    // Audit Log
    await AuditLog.create({
      userId: reviewerUserId,
      userRole: reviewerRole,
      action: "LEAVE_REJECTED",
      entityType: "LEAVE",
      entityId: leave._id.toString(),
      schoolId,
      metadata: {
        leaveId: leave._id.toString(),
        applicantRole: leave.applicantRole,
        rejectionReason,
      },
    });

    return leave;
  }

  /**
   * Cancel a pending leave request
   */
  static async cancelLeave(
    schoolId: string,
    leaveId: string,
    userId: string,
    userRole: UserRole
  ): Promise<ILeaveRequest> {
    const leave = await LeaveRequest.findOne({
      _id: leaveId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isActive: true,
    });

    if (!leave) {
      throw new Error("Leave request not found");
    }

    if (leave.status !== "PENDING") {
      throw new Error(`Cannot cancel a leave request that is already ${leave.status.toLowerCase()}`);
    }

    // Authorize cancellation: applicant or Admin
    if (userRole !== "ADMIN" && leave.applicantUserId.toString() !== userId) {
      throw new Error("You are not authorized to cancel this leave request");
    }

    leave.status = "CANCELLED";
    await leave.save();

    await AuditLog.create({
      userId,
      userRole,
      action: "LEAVE_CANCELLED",
      entityType: "LEAVE",
      entityId: leave._id.toString(),
      schoolId,
      metadata: { leaveId: leave._id.toString() },
    });

    return leave;
  }
}
