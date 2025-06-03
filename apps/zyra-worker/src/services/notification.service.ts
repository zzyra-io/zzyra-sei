import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { EmailService } from './email.service';
import axios from 'axios';
import * as Handlebars from 'handlebars';
import { NotificationGateway } from '../gateways/notification.gateway';

// Define notification types
export type NotificationType =
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'node_error'
  | 'quota_alert'
  | 'system_alert'
  | 'new_comment'
  | 'new_follower'
  | 'new_like'
  | 'new_mention'
  | 'new_message'
  | 'new_post'
  | 'new_reply'
  | 'new_share';

// Define notification channels
export type NotificationChannel = 'email' | 'telegram' | 'discord' | 'in_app';

// Define notification template
interface NotificationTemplate {
  id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
}

// Define notification preference
interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  email_enabled: boolean;
  telegram_enabled: boolean;
  discord_enabled: boolean;
  in_app_enabled: boolean;
}

// Define user contact info
interface UserContactInfo {
  id: string;
  email: string;
  full_name: string;
  telegram_handle?: string;
  discord_webhook?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    private databaseService: DatabaseService,
    private notificationGateway?: NotificationGateway,
  ) {}

  /**
   * Send a notification to a user
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      // 1. Get user notification preferences
      const preferences = await this.getUserNotificationPreferences(
        userId,
        type,
      );
      if (!preferences) {
        this.logger.warn(
          `No notification preferences found for user ${userId} and type ${type}`,
        );
        return;
      }

      // 2. Send notifications through enabled channels
      const results = await Promise.allSettled([
        // Email notification
        preferences.email_enabled && data.email
          ? this.sendEmailNotification(userId, type, data.email, data)
          : Promise.resolve(null),

        // Telegram notification
        preferences.telegram_enabled && data.telegram_handle
          ? this.sendTelegramNotification(
              userId,
              type,
              data.telegram_handle,
              data,
            )
          : Promise.resolve(null),

        // Discord notification
        preferences.discord_enabled && data.discord_webhook
          ? this.sendDiscordNotification(
              userId,
              type,
              data.discord_webhook,
              data,
            )
          : Promise.resolve(null),

        // In-app notification
        preferences.in_app_enabled
          ? this.saveInAppNotification(userId, type, data)
          : Promise.resolve(null),
      ]);

      // Log results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.error(`Failed to send notification: ${result.reason}`);
        }
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send notification: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(
    userId: string,
    type: NotificationType,
  ): Promise<NotificationPreference | null> {
    try {
      this.logger.log(
        `Fetching notification preferences for user ${userId} and type ${type}`,
      );

      // First, ensure user profile exists using DatabaseService
      await this.databaseService.getOrCreateUserProfile(userId);

      // Get notification preference using direct Prisma query
      const preference =
        await this.databaseService.prisma.notificationPreference.findFirst({
          where: {
            userId: userId,
          },
        });

      if (preference) {
        return {
          id: preference.id,
          user_id: preference.userId,
          notification_type: type,
          email_enabled: preference.emailEnabled,
          telegram_enabled: false, // Not in current schema
          discord_enabled: false, // Not in current schema
          in_app_enabled: preference.pushEnabled,
        };
      }

      // Return default preferences if none found
      return {
        id: '',
        user_id: userId,
        notification_type: type,
        email_enabled:
          type === 'workflow_failed' ||
          type === 'node_error' ||
          type === 'quota_alert',
        telegram_enabled: false,
        discord_enabled: false,
        in_app_enabled: true,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching notification preferences: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Get user contact information
   */
  private async getUserContactInfo(
    userId: string,
  ): Promise<UserContactInfo | null> {
    try {
      const user = await this.databaseService.users.findById(userId);
      if (!user) {
        this.logger.warn(`User ${userId} not found`);
        return null;
      }

      return {
        id: user.id,
        email: user.email || 'unknown@example.com',
        full_name: user.email || 'Unknown User', // Use email as name since name field doesn't exist
        telegram_handle: undefined, // Not in current schema
        discord_webhook: undefined, // Not in current schema
      };
    } catch (error) {
      this.logger.error(
        `Error fetching user contact info: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Get notification template
   */
  private async getNotificationTemplate(
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null> {
    try {
      // Use direct Prisma query for notification templates
      const template =
        await this.databaseService.prisma.notificationTemplate.findFirst({
          where: {
            type: type,
          },
        });

      if (template) {
        return {
          id: template.id,
          notification_type: type,
          channel: channel,
          subject: template.title, // Map title to subject
          body: template.message, // Map message to body
        };
      }

      // Return default template if none found
      return this.getDefaultTemplate(type, channel);
    } catch (error) {
      this.logger.error(
        `Error fetching notification template: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.getDefaultTemplate(type, channel);
    }
  }

  private getDefaultTemplate(
    type: NotificationType,
    channel: NotificationChannel,
  ): NotificationTemplate {
    const templates = {
      workflow_started: {
        email: {
          subject: 'Workflow Started: {{workflow_name}}',
          body: 'Your workflow "{{workflow_name}}" has started execution.',
        },
        telegram: {
          subject: null,
          body: '🚀 Workflow "{{workflow_name}}" started execution',
        },
        discord: {
          subject: null,
          body: '🚀 **Workflow Started**: {{workflow_name}}',
        },
        in_app: {
          subject: 'Workflow Started',
          body: 'Workflow "{{workflow_name}}" has started',
        },
      },
      workflow_completed: {
        email: {
          subject: 'Workflow Completed: {{workflow_name}}',
          body: 'Your workflow "{{workflow_name}}" has completed successfully.',
        },
        telegram: {
          subject: null,
          body: '✅ Workflow "{{workflow_name}}" completed successfully',
        },
        discord: {
          subject: null,
          body: '✅ **Workflow Completed**: {{workflow_name}}',
        },
        in_app: {
          subject: 'Workflow Completed',
          body: 'Workflow "{{workflow_name}}" completed successfully',
        },
      },
      workflow_failed: {
        email: {
          subject: 'Workflow Failed: {{workflow_name}}',
          body: 'Your workflow "{{workflow_name}}" has failed. Error: {{error}}',
        },
        telegram: {
          subject: null,
          body: '❌ Workflow "{{workflow_name}}" failed: {{error}}',
        },
        discord: {
          subject: null,
          body: '❌ **Workflow Failed**: {{workflow_name}} - {{error}}',
        },
        in_app: {
          subject: 'Workflow Failed',
          body: 'Workflow "{{workflow_name}}" failed: {{error}}',
        },
      },
    };

    const typeTemplates = templates[type] || templates.workflow_started;
    const template = typeTemplates[channel] || typeTemplates.in_app;

    return {
      id: 'default',
      notification_type: type,
      channel: channel,
      subject: template.subject,
      body: template.body,
    };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userId: string,
    type: NotificationType,
    email: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      // Get template
      const template = await this.getNotificationTemplate(type, 'email');
      if (!template) {
        throw new Error(
          `No email template found for notification type ${type}`,
        );
      }

      // Compile template
      const subjectTemplate = Handlebars.compile(template.subject || '');
      const bodyTemplate = Handlebars.compile(template.body);

      const subject = subjectTemplate(data);
      const body = bodyTemplate(data);

      // Send email
      await this.emailService.sendEmail({
        to: email,
        subject,
        html: body,
      });

      // Log notification
      await this.logNotification(
        userId,
        type,
        'email',
        { subject, body },
        'success',
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send email notification: ${err.message}`,
        err.stack,
      );
      await this.logNotification(
        userId,
        type,
        'email',
        {},
        'failed',
        err.message,
      );
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegramNotification(
    userId: string,
    type: NotificationType,
    telegramHandle: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      // Get template
      const template = await this.getNotificationTemplate(type, 'telegram');
      if (!template) {
        throw new Error(
          `No telegram template found for notification type ${type}`,
        );
      }

      // Compile template
      const bodyTemplate = Handlebars.compile(template.body);
      const message = bodyTemplate(data);

      // In a real implementation, you would use the Telegram Bot API to send the message
      // This is a placeholder for demonstration purposes
      this.logger.log(`[TELEGRAM] Would send to ${telegramHandle}: ${message}`);

      // Log notification
      await this.logNotification(
        userId,
        type,
        'telegram',
        { message },
        'success',
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send telegram notification: ${err.message}`,
        err.stack,
      );
      await this.logNotification(
        userId,
        type,
        'telegram',
        {},
        'failed',
        err.message,
      );
    }
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(
    userId: string,
    type: NotificationType,
    webhookUrl: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      // Get template
      const template = await this.getNotificationTemplate(type, 'discord');
      if (!template) {
        throw new Error(
          `No discord template found for notification type ${type}`,
        );
      }

      // Compile template
      const bodyTemplate = Handlebars.compile(template.body);
      const payload = JSON.parse(bodyTemplate(data));

      // Send to Discord webhook
      if (webhookUrl) {
        await axios.post(webhookUrl, payload);
      }

      // Log notification
      await this.logNotification(userId, type, 'discord', payload, 'success');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send discord notification: ${err.message}`,
        err.stack,
      );
      await this.logNotification(
        userId,
        type,
        'discord',
        {},
        'failed',
        err.message,
      );
    }
  }

  /**
   * Save in-app notification
   */
  private async saveInAppNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      const template = await this.getNotificationTemplate(type, 'in_app');
      if (!template) return;

      const compiledSubject = Handlebars.compile(template.subject || '')(data);
      const compiledBody = Handlebars.compile(template.body)(data);

      await this.databaseService.notifications.create({
        userId: userId,
        type: type,
        title: compiledSubject,
        message: compiledBody,
        data: data,
        read: false,
      });

      // Emit real-time notification if gateway is available
      if (this.notificationGateway) {
        this.notificationGateway.sendNotificationToUser(userId, {
          type,
          title: compiledSubject,
          message: compiledBody,
          data,
        });
      }

      await this.logNotification(
        userId,
        type,
        'in_app',
        { subject: compiledSubject, body: compiledBody },
        'success',
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to save in-app notification: ${err.message}`);
      await this.logNotification(
        userId,
        type,
        'in_app',
        {},
        'failed',
        err.message,
      );
    }
  }

  /**
   * Send a test notification for debugging purposes
   */
  async sendTestNotification(userId: string): Promise<void> {
    this.logger.log(`Inserting test notification for user ${userId}`);
    if (!this.databaseService.prisma) {
      this.logger.error(
        'Prisma client not initialized. Cannot insert test notification.',
      );
      return;
    }
    // Verify user exists
    const user = await this.databaseService.users.findById(userId);
    if (!user) {
      this.logger.error(
        `Error checking user existence: User ${userId} not found`,
      );
      return;
    }
    const payload = { timestamp: new Date().toISOString() };
    const title = 'Test Notification';
    const message = 'This is a test notification from Zyra.';
    const notification = await this.databaseService.prisma.notification.create({
      data: {
        userId: userId,
        type: 'info',
        title,
        message,
        data: payload,
        read: false,
      },
    });
    if (!notification) {
      this.logger.error(
        `Failed to insert test notification: Notification not created`,
      );
    } else {
      this.logger.log(
        `Test notification inserted successfully for user ${userId}`,
      );
    }
  }

  /**
   * Log notification attempt
   */
  private async logNotification(
    userId: string,
    type: NotificationType,
    channel: string,
    content: Record<string, any>,
    status: 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    try {
      // Use direct Prisma query for notification logs
      await this.databaseService.prisma.notificationLog.create({
        data: {
          userId: userId,
          channel: channel,
          status: status,
          error: errorMessage,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
