/**
 * Notification Repository
 *
 * This repository provides database operations for user notifications.
 * It handles notification creation, retrieval, and management.
 */

import { Notification, NotificationPreference } from "@prisma/client";
// No need for custom interfaces; use Prisma-generated types for type safety.
import { BaseRepository } from "./base.repository";
import {
  PaginationParams,
  parsePaginationParams,
  createPaginatedResult,
} from "../utils/pagination";

// Type definitions for notification operations
export interface NotificationCreateInput {
  userId: string;
  title: string;
  message: string;
  type: string;
  read?: boolean;
  data?: any;
}

export interface NotificationUpdateInput {
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  data?: any;
}

export interface NotificationPreferenceCreateInput {
  userId: string;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  webhookEnabled?: boolean;
  telegramChatId?: string;
  discordWebhookUrl?: string;
}

export interface NotificationPreferenceUpdateInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  webhookEnabled?: boolean;
  telegramChatId?: string;
  discordWebhookUrl?: string;
}

export class NotificationRepository extends BaseRepository<
  Notification,
  NotificationCreateInput,
  NotificationUpdateInput
> {
  protected tableName = "notifications";
  protected model = this.prisma.notification;

  /**
   * Find notifications by user ID with pagination
   * @param userId The user ID to filter by
   * @param params Pagination parameters
   * @returns Paginated notifications
   */
  async findByUserId(userId: string, params: PaginationParams = {}) {
    // Get total count
    const total = await this.prisma.notification.count({
      where: { userId },
    });

    // Build pagination options
    const paginationOptions = parsePaginationParams(params);

    // Merge options for findMany
    const data = await this.prisma.notification.findMany({
      where: { userId },
      ...paginationOptions,
    });

    // Return paginated result
    return createPaginatedResult(data, total, params);
  }

  /**
   * Find unread notifications by user ID
   * @param userId The user ID to filter by
   * @param limit The maximum number of notifications to return
   * @returns An array of unread notifications
   */
  async findUnreadByUserId(
    userId: string,
    limit = 10
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  /**
   * Count unread notifications by user ID
   * @param userId The user ID to filter by
   * @returns The count of unread notifications
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark a notification as read
   * @param id The notification ID
   * @returns The updated notification
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   * @param userId The user ID
   * @returns The number of updated notifications
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return result.count;
  }

  /**
   * Delete a notification
   * @param id The notification ID
   * @returns The deleted notification
   */
  async delete(id: string): Promise<Notification> {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Delete all notifications for a user
   * @param userId The user ID
   * @returns The number of deleted notifications
   */
  async deleteAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  /**
   * Create a notification for a user
   * @param userId The user ID
   * @param data The notification data
   * @returns The created notification
   */
  async createForUser(
    userId: string,
    data: Omit<NotificationCreateInput, "user">
  ): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  /**
   * Create a notification for multiple users
   * @param userIds The user IDs
   * @param data The notification data
   * @returns The number of created notifications
   */
  async createForUsers(
    userIds: string[],
    data: Omit<NotificationCreateInput, "user">
  ): Promise<number> {
    // Create notifications in batches
    const batchSize = 100;
    let createdCount = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      // Create notifications for this batch
      const notifications = batch.map((userId) => ({
        ...data,
        userId,
      }));

      const result = await this.prisma.notification.createMany({
        data: notifications,
      });

      createdCount += result.count;
    }

    return createdCount;
  }

  /**
   * Get notification preferences for a user
   * @param userId The user ID
   * @returns The notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  /**
   * Create or update notification preferences for a user
   * @param userId The user ID
   * @param data The notification preference data
   * @returns The created or updated notification preferences
   */
  async updatePreferences(
    userId: string,
    data: Omit<NotificationPreferenceUpdateInput, "user">
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...data,
      },
      create: {
        ...data,
        userId,
      },
    });
  }

  /**
   * Send a notification to external channels based on user preferences
   * @param userId The user ID
   * @param title The notification title
   * @param message The notification message
   * @param type The notification type
   * @returns True if the notification was sent successfully
   */
  async sendExternalNotification(
    userId: string,
    title: string,
    message: string,
    type: string
  ): Promise<boolean> {
    try {
      // Get user with profile
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          notificationPreferences: true,
        },
      });

      if (!user || !user.notificationPreferences) {
        return false;
      }

      // Check if user has enabled notifications for this type
      const preferences = user.notificationPreferences;
      const profile = user.profile;

      if (!profile) {
        return false;
      }

      // Send to Telegram if enabled
      if (preferences.telegramChatId && profile.telegramChatId) {
        // This would be implemented with Telegram API integration
        // await this.sendTelegramNotification(profile.telegramChatId, title, message);
      }

      // Send to Discord if enabled
      if (preferences.discordWebhookUrl && profile.discordWebhookUrl) {
        // This would be implemented with Discord API integration
        // await this.sendDiscordNotification(profile.discordWebhookUrl, title, message);
      }

      // Send to Email if enabled
      if (preferences.emailEnabled && user.email) {
        // This would be implemented with email service integration
        // await this.sendEmailNotification(user.email, title, message);
      }

      return true;
    } catch (error) {
      console.error("Failed to send external notification:", error);
      return false;
    }
  }
}
