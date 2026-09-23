import mongoose from "mongoose";
import Notification, {
  INotification,
  NotificationType,
  NotificationReferenceType,
} from "@/models/Notification";
import { INotice } from "@/models/Notice";
import { NoticeAudienceService } from "./noticeAudienceService";

export interface CreateNotificationInput {
  schoolId: string | mongoose.Types.ObjectId;
  recipientUserId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: NotificationReferenceType;
  referenceId?: string | null;
  actionUrl?: string | null;
  expiresAt?: Date | null;
}

export class NotificationService {
  /**
   * Creates an individual in-app notification with duplicate prevention.
   */
  public static async createNotification(
    data: CreateNotificationInput
  ): Promise<INotification | null> {
    const {
      schoolId,
      recipientUserId,
      type,
      title,
      message,
      referenceType = "NONE",
      referenceId = null,
      actionUrl = null,
      expiresAt = null,
    } = data;

    // Idempotency check: if notification with same reference exists, skip duplicate insertion
    if (referenceId && referenceType !== "NONE") {
      const existing = await Notification.findOne({
        schoolId,
        recipientUserId,
        type,
        referenceType,
        referenceId,
      }).lean();

      if (existing) {
        return existing as unknown as INotification;
      }
    }

    return await Notification.create({
      schoolId,
      recipientUserId,
      type,
      title,
      message,
      referenceType,
      referenceId,
      actionUrl,
      expiresAt,
    });
  }

  /**
   * Generates and dispatches in-app notifications for all eligible recipients when a notice is published.
   * Utilizes bulk insertion and idempotency filtering.
   */
  public static async createNoticeNotifications(notice: INotice): Promise<number> {
    const schoolId = notice.schoolId;
    const noticeId = notice._id.toString();

    // 1. Resolve eligible user IDs
    const recipientUserIds = await NoticeAudienceService.resolveNoticeRecipients(notice);
    if (recipientUserIds.length === 0) {
      return 0;
    }

    // 2. Check which recipients already received this notice notification to prevent duplicates
    const existingNotifications = await Notification.find({
      schoolId,
      referenceType: "NOTICE",
      referenceId: noticeId,
      recipientUserId: { $in: recipientUserIds },
    })
      .select("recipientUserId")
      .lean();

    const existingUserSet = new Set(
      existingNotifications.map((n) => n.recipientUserId.toString())
    );

    const newRecipients = recipientUserIds.filter((uid) => !existingUserSet.has(uid));
    if (newRecipients.length === 0) {
      return 0;
    }

    // 3. Prepare notification records for bulk insertion
    const notificationDocs = newRecipients.map((recipientUserId) => ({
      schoolId,
      recipientUserId,
      type: "NOTICE" as NotificationType,
      title: notice.title,
      message:
        notice.description.length > 150
          ? `${notice.description.substring(0, 147)}...`
          : notice.description,
      referenceType: "NOTICE" as NotificationReferenceType,
      referenceId: noticeId,
      actionUrl: `/admin/notices/${noticeId}`,
      isRead: false,
      expiresAt: notice.expiresAt || null,
    }));

    // 4. Efficient bulk insertion
    const result = await Notification.insertMany(notificationDocs, { ordered: false });
    return result.length;
  }

  /**
   * Gets unread notification count for an authenticated user.
   */
  public static async getUnreadCount(
    schoolId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    return await Notification.countDocuments({
      schoolId,
      recipientUserId: userId,
      isRead: false,
    });
  }

  /**
   * Fetches paginated notifications for an authenticated user.
   */
  public static async getUserNotifications(
    schoolId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    options: {
      isRead?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      schoolId,
      recipientUserId: userId,
    };

    if (options.isRead !== undefined) {
      query.isRead = options.isRead;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        schoolId,
        recipientUserId: userId,
        isRead: false,
      }),
    ]);

    return {
      notifications: notifications as unknown as INotification[],
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Marks an individual notification as read.
   */
  public static async markAsRead(
    schoolId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    notificationId: string | mongoose.Types.ObjectId
  ): Promise<boolean> {
    const result = await Notification.updateOne(
      {
        _id: notificationId,
        schoolId,
        recipientUserId: userId,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return result.matchedCount > 0;
  }

  /**
   * Marks all unread notifications as read for an authenticated user.
   */
  public static async markAllAsRead(
    schoolId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    const result = await Notification.updateMany(
      {
        schoolId,
        recipientUserId: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }
}
