import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from './email.service';
import axios from 'axios';
import * as Handlebars from 'handlebars';
import { createServiceClient } from '@/lib/supabase/serviceClient';
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
  private supabase: SupabaseClient | null;
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    private notificationGateway?: NotificationGateway,
  ) {
    // Initialize Supabase client
    this.supabase = createServiceClient();
  }

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
          ? this.sendTelegramNotification(userId, type, data.telegram_handle, data)
          : Promise.resolve(null),

        // Discord notification
        preferences.discord_enabled && data.discord_webhook
          ? this.sendDiscordNotification(userId, type, data.discord_webhook, data)
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
      if (!this.supabase) {
        this.logger.warn(
          'Supabase client not initialized. Cannot fetch notification preferences.',
        );
        // Return a default preference
        return {
          id: '',
          user_id: userId,
          notification_type: type,
          email_enabled: true,
          telegram_enabled: false,
          discord_enabled: false,
          in_app_enabled: false,
        };
      }
      this.logger.log(
        `Fetching notification preferences for user ${userId} and type ${type}`,
      );
      // First, check if user profile exists
      this.logger.log(`Checking if profile exists for user ${userId}`);
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .limit(1);
      if (profileError) {
        this.logger.error(
          `Error checking user profile: ${profileError.message}`,
        );
        return null;
      }
      if (!profileData || profileData.length === 0) {
        this.logger.log(`Profile not found for user ${userId}. Creating one.`);
        const { error: insertProfileError } = await this.supabase
          .from('profiles')
          .insert({ id: userId, email: 'unknown@example.com' });
        if (insertProfileError) {
          this.logger.error(
            `Failed to create user profile: ${insertProfileError.message}`,
          );
          // If profile creation fails due to foreign key constraint, use default preferences
          if (insertProfileError.message.includes('foreign key constraint')) {
            this.logger.log(
              `Using default preferences since profile creation failed due to foreign key constraint for user ${userId}`,
            );
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
          }
          return null;
        }
        this.logger.log(`Successfully created profile for user ${userId}`);
      } else {
        this.logger.log(`Profile found for user ${userId}`);
      }
      // Now, fetch notification preferences
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('notification_type', type)
        .limit(1);
      if (error) {
        this.logger.error(
          `Error fetching notification preferences: ${error.message}`,
        );
        // Try to create default preferences for this type
        const defaultPreferences = {
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
        this.logger.log(
          `Creating default notification preferences for user ${userId} due to error`,
        );
        const { data: newData, error: newError } = await this.supabase
          .from('notification_preferences')
          .insert(defaultPreferences)
          .select('*')
          .limit(1);
        if (newError) {
          this.logger.error(
            `Failed to create default notification preferences: ${newError.message}`,
          );
          // If insertion fails, return default preferences without saving to database
          this.logger.log(
            `Returning default preferences for user ${userId} since insertion failed`,
          );
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
        }
        this.logger.log(
          `Successfully created default notification preferences for user ${userId}`,
        );
        return newData && newData.length > 0
          ? (newData[0] as NotificationPreference)
          : null;
      }
      this.logger.log(
        `Found existing notification preferences for user ${userId}`,
      );
      return data && data.length > 0
        ? (data[0] as NotificationPreference)
        : null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to get notification preferences: ${err.message}`,
        err.stack,
      );
      return null;
    }
  }

  /**
   * Get user contact info
   */
  private async getUserContactInfo(
    userId: string,
  ): Promise<UserContactInfo | null> {
    try {
      if (!this.supabase) {
        this.logger.warn(
          'Supabase client not initialized. Cannot fetch user contact info.',
        );
        return null;
      }
      // Get user email from auth.users
      let email: string | null = null;
      try {
        const { data: userData, error } = await this.supabase
          .from('users')
          .select('email')
          .eq('id', userId)
          .limit(1);
        if (error) {
          this.logger.error(
            `Error fetching user email from users table: ${error.message}`,
          );
          // If the table doesn't exist, we'll try profiles next
        } else if (userData && userData.length > 0) {
          email = userData[0].email || null;
        }
      } catch (err) {
        this.logger.error(
          `Exception when accessing users table: ${(err as Error).message}`,
        );
      }
      // If no email from users table, try profiles
      if (!email) {
        try {
          const { data: profileData, error } = await this.supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .limit(1);
          if (error) {
            this.logger.error(
              `Error fetching user email from profiles table: ${error.message}`,
            );
          } else if (profileData && profileData.length > 0) {
            email = profileData[0].email || null;
          }
        } catch (err) {
          this.logger.error(
            `Exception when accessing profiles table: ${(err as Error).message}`,
          );
        }
      }
      // Get additional contact info from profiles if available
      let telegramHandle: string | null = null;
      let discordWebhook: string | null = null;
      try {
        const { data: profileData, error } = await this.supabase
          .from('profiles')
          .select('telegram_handle, discord_webhook')
          .eq('id', userId)
          .limit(1);
        if (error) {
          this.logger.error(
            `Error fetching additional contact info: ${error.message}`,
          );
        } else if (profileData && profileData.length > 0) {
          telegramHandle = profileData[0].telegram_handle || null;
          discordWebhook = profileData[0].discord_webhook || null;
        }
      } catch (err) {
        this.logger.error(
          `Exception when accessing profiles for contact info: ${(err as Error).message}`,
        );
      }
      // Return contact info if we have any
      if (email || telegramHandle || discordWebhook) {
        return {
          id: userId,
          email,
          full_name: '',
          telegram_handle: telegramHandle,
          discord_webhook: discordWebhook,
        };
      }
      this.logger.warn(`No user contact info found for user ${userId}`);
      return null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to get user contact info: ${err.message}`,
        err.stack,
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
      if (!this.supabase) {
        this.logger.warn(
          'Supabase client not initialized. Cannot fetch notification template.',
        );
        return null;
      }
      const { data, error } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('notification_type', type)
        .eq('channel', channel)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as NotificationTemplate | null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to get notification template: ${err.message}`,
        err.stack,
      );
      return null;
    }
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
      if (!this.supabase) {
        this.logger.warn(
          'Supabase client not initialized. Cannot save in-app notification.',
        );
        return;
      }
      // Get template for in-app notification
      const template = await this.getNotificationTemplate(type, 'in_app');
      if (!template) {
        throw new Error(`No template found for notification type ${type}`);
      }

      // Compile template
      const subjectTemplate = Handlebars.compile(template.subject || '');
      const bodyTemplate = Handlebars.compile(template.body);

      const title = subjectTemplate(data);
      const message = bodyTemplate(data);

      // First check if user exists in profiles table
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .limit(1);

      if (profileError) {
        this.logger.error(`Error checking user profile: ${profileError.message}`);
        throw profileError;
      }

      // Create profile if it doesn't exist
      if (!profileData || profileData.length === 0) {
        this.logger.warn(`User profile not found for ${userId}, attempting to create`);
        const { error: insertError } = await this.supabase
          .from('profiles')
          .insert({ id: userId });

        if (insertError) {
          this.logger.error(`Failed to create user profile: ${insertError.message}`);
          throw insertError;
        }
        this.logger.log(`Created profile for user ${userId}`);
      }

      // Map notification type to UI type
      let uiType: 'info' | 'success' | 'warning' | 'error' = 'info';
      switch (type) {
        case 'workflow_completed':
          uiType = 'success';
          break;
        case 'quota_alert':
          uiType = 'warning';
          break;
        case 'workflow_failed':
        case 'node_error':
          uiType = 'error';
          break;
        default:
          uiType = 'info';
      }

      // Save the notification to Supabase using the correct schema
      const notificationData = {
        user_id: userId,
        type: uiType,
        title,
        message,
        data: {
          originalType: type,
          ...data,
          timestamp: new Date().toISOString(),
        },
        read: false,
      };

      const { data: insertedNotification, error } = await this.supabase
        .from('notifications')
        .insert(notificationData)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Send real-time notification via WebSocket if gateway is available
      if (this.notificationGateway && insertedNotification) {
        this.logger.log(`Sending real-time notification to user ${userId}`);
        this.notificationGateway.sendNotificationToUser(userId, insertedNotification);
      }

      this.logger.log(
        `[IN-APP] Saved notification for user ${userId}: ${title} (${type})`,
      );

      // Log notification
      await this.logNotification(
        userId,
        type,
        'in_app',
        notificationData,
        'success',
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to save in-app notification: ${err.message}`,
        err.stack,
      );
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
    if (!this.supabase) {
      this.logger.error('Supabase client not initialized. Cannot insert test notification.');
      return;
    }
    // Verify user exists in auth system (profiles table)
    const { data: profileData, error: profileErr } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .limit(1);
    if (profileErr) {
      this.logger.error(`Error checking user existence: ${profileErr.message}`);
      return;
    }
    if (!profileData || profileData.length === 0) {
      this.logger.warn(`Test notification skipped: user ${userId} not found in auth system`);
      return;
    }
    const payload = { timestamp: new Date().toISOString() };
    const title = 'Test Notification';
    const message = 'This is a test notification from Zyra.';
    const { error } = await this.supabase.from('notifications').insert({
      user_id: userId,
      type: 'info',
      title,
      message,
      data: payload,
      read: false,
    });
    if (error) {
      this.logger.error(`Failed to insert test notification: ${error.message}`);
    } else {
      this.logger.log(`Test notification inserted successfully for user ${userId}`);
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
      if (!this.supabase) {
        this.logger.warn(
          'Supabase client not initialized. Cannot log notification.',
        );
        return;
      }
      await this.supabase.from('notification_logs').insert({
        user_id: userId,
        notification_type: type,
        channel,
        content,
        status,
        error_message: errorMessage,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to log notification: ${err.message}`,
        err.stack,
      );
    }
  }
}
