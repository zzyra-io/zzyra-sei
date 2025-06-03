import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class NotificationBlockHandler implements BlockHandler {
  private readonly logger = new Logger(NotificationBlockHandler.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId, executionId, userId } = ctx;
    const data = node.data || {};

    this.logger.log(`Executing Notification block: ${nodeId}`);

    try {
      // Validate required fields
      if (!data.type) {
        throw new Error('Notification type is required');
      }
      if (!data.title) {
        throw new Error('Notification title is required');
      }
      if (!data.message) {
        throw new Error('Notification message is required');
      }
      if (!data.channel) {
        throw new Error('Notification channel is required');
      }
      if (
        !data.recipients ||
        !Array.isArray(data.recipients) ||
        data.recipients.length === 0
      ) {
        throw new Error('Notification recipients are required');
      }

      // Send notification through the notification service
      await this.notificationService.sendNotification(userId, data.type, {
        title: data.title,
        message: data.message,
        recipients: data.recipients,
        channel: data.channel,
        priority: data.config?.priority || 'normal',
        execution_id: executionId,
        node_id: nodeId,
      });

      // Store notification record in database
      const notification =
        await this.databaseService.prisma.notification.create({
          data: {
            type: data.type,
            title: data.title,
            message: data.message,
            userId: userId,
            data: {
              recipients: data.recipients,
              channel: data.channel,
              executionId: executionId,
              nodeId: nodeId,
              priority: data.config?.priority || 'normal',
            },
          },
        });

      // Log the notification delivery
      await this.databaseService.prisma.notificationLog.create({
        data: {
          userId: userId,
          channel: data.channel,
          status: 'sent',
          notificationId: notification.id,
        },
      });

      return {
        success: true,
        data: {
          sent: true,
          recipients: data.recipients,
          channel: data.channel,
        },
      };
    } catch (error: any) {
      this.logger.error(`Notification failed: ${error.message}`);

      // Store failed notification record
      try {
        const notification =
          await this.databaseService.prisma.notification.create({
            data: {
              type: data.type || 'unknown',
              title: data.title || 'Failed notification',
              message: data.message || 'Failed to send',
              userId: userId,
              data: {
                recipients: data.recipients || [],
                channel: data.channel || 'unknown',
                executionId: executionId,
                nodeId: nodeId,
                error: error.message,
              },
            },
          });

        // Log the failed notification
        await this.databaseService.prisma.notificationLog.create({
          data: {
            userId: userId,
            channel: data.channel || 'unknown',
            status: 'failed',
            error: error.message,
            notificationId: notification.id,
          },
        });
      } catch (dbError: any) {
        this.logger.error(
          `Failed to store notification record: ${dbError.message}`,
        );
      }

      throw error;
    }
  }
}
