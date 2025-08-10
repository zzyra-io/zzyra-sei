import { Injectable } from "@nestjs/common";
import { NotificationRepository } from "@zzyra/database";
import { Notification, PaginatedResult } from "@zzyra/database";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository
  ) {}

  async getNotifications(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationRepository.findByUserId(userId, { page, limit });
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.countUnreadByUserId(userId);
    return { unread_count: count };
  }

  async markAllAsRead(userId: string) {
    const count = await this.notificationRepository.markAllAsRead(userId);
    return { marked_count: count };
  }

  async createNotification(
    userId: string,
    data: {
      title: string;
      message: string;
      type: string;
      data?: any;
    }
  ): Promise<any> {
    return this.notificationRepository.createForUser(userId, {
      title: data.title,
      message: data.message,
      type: data.type,
      userId,
      data: data.data,
    });
  }

  async getNotificationLogs(userId: string) {
    // Stub - would get notification logs
    return [];
  }

  async testNotification(
    userId: string,
    data: {
      type: string;
      title: string;
      message: string;
    }
  ): Promise<{ success: boolean; notification: any }> {
    // Create test notification
    const notification = await this.createNotification(userId, data);

    // Send external notification
    await this.notificationRepository.sendExternalNotification(
      userId,
      data.title,
      data.message,
      data.type
    );

    return { success: true, notification };
  }

  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    // Optionally, check ownership here
    return this.notificationRepository.markAsRead(notificationId);
  }
}
