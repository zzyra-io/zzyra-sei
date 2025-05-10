import { createServiceClient } from '../../lib/supabase/serviceClient';
import { Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';

export class NotificationBlockHandler implements BlockHandler {
  private readonly logger = new Logger(NotificationBlockHandler.name);

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config || {};
    const supabase = createServiceClient();

    // Use userId from execution context
    const userId = ctx.userId;
    if (!userId) {
      throw new Error('User ID not found in execution context');
    }

    // Validate required fields
    const { type: notificationType = 'info', title, message } = cfg;
    if (!title) {
      throw new Error('Notification title is required');
    }
    if (!message) {
      throw new Error('Notification message is required');
    }

    // Normalize notification type
    const uiType = this.normalizeNotificationType(notificationType);

    // Insert in-app notification
    const payload = {
      originalType: notificationType,
      timestamp: new Date().toISOString(),
      workflowData: {
        nodeId: ctx.workflowData.nodeId,
        executionId: ctx.executionId,
      },
    };

    this.logger.debug(
      `Creating notification for user ${userId}: ${title} (${uiType})`,
    );

    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type: uiType,
        title,
        message,
        data: payload,
        read: false,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Notification insert failed: ${error.message}`);
      }

      return {
        success: true,
        notificationId: payload.timestamp, // Can be used for tracking
        type: uiType,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Failed to create notification: ${errorMessage}`);
      throw new Error(`Notification creation failed: ${errorMessage}`);
    }
  }

  private normalizeNotificationType(
    type: string,
  ): 'info' | 'success' | 'warning' | 'error' {
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
      case 'success':
      case 'ok':
      case 'done':
        return 'success';

      case 'warning':
      case 'warn':
        return 'warning';

      case 'error':
      case 'fail':
      case 'failed':
        return 'error';

      default:
        return 'info';
    }
  }
}
