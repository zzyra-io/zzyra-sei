import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailBlockHandler implements BlockHandler {
  private readonly logger = new Logger(EmailBlockHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId, executionId, userId } = ctx;
    const data = node.data || {};

    this.logger.log(`Executing Email block: ${nodeId}`);

    try {
      // Validate required email configuration
      this.validateEmailConfig();

      // Validate required fields
      if (!data.to) {
        throw new Error('Email recipient is required');
      }
      if (!data.subject) {
        throw new Error('Email subject is required');
      }
      if (!data.body) {
        throw new Error('Email body is required');
      }

      // Create email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Process email template if specified
      let emailBody = data.body;
      let emailSubject = data.subject;

      if (data.config?.template) {
        const template = await this.getEmailTemplate(data.config.template);
        if (template) {
          emailBody = this.processTemplate(
            template.message,
            data.variables || {},
          );
          emailSubject = this.processTemplate(
            template.title,
            data.variables || {},
          );
        }
      }

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.to,
        subject: emailSubject,
        html: emailBody,
        attachments: data.config?.attachments || [],
      };

      const result = await transporter.sendMail(mailOptions);

      // Log successful email send
      await this.logEmailSent(userId, executionId, nodeId, {
        to: data.to,
        subject: emailSubject,
        messageId: result.messageId,
        status: 'sent',
      });

      return {
        success: true,
        data: {
          messageId: result.messageId,
          envelope: result.envelope,
          accepted: result.accepted,
          rejected: result.rejected,
        },
      };
    } catch (error: any) {
      this.logger.error(`Email sending failed: ${error.message}`);

      // Log failed email attempt
      await this.logEmailSent(userId, executionId, nodeId, {
        to: data.to || 'unknown',
        subject: data.subject || 'unknown',
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Validate email configuration
   */
  private validateEmailConfig(): void {
    const requiredVars = [
      'EMAIL_HOST',
      'EMAIL_PORT',
      'EMAIL_USER',
      'EMAIL_PASS',
    ];
    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(`Email configuration is missing: ${missing.join(', ')}`);
    }
  }

  /**
   * Get email template from database
   */
  private async getEmailTemplate(templateId: string): Promise<any> {
    try {
      const template =
        await this.databaseService.prisma.notificationTemplate.findUnique({
          where: { id: templateId },
        });
      return template;
    } catch (error: any) {
      this.logger.error(`Failed to get email template: ${error.message}`);
      return null;
    }
  }

  /**
   * Process template with variables
   */
  private processTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    let processed = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(placeholder, String(value));
    }

    return processed;
  }

  /**
   * Log email sending activity
   */
  private async logEmailSent(
    userId: string,
    executionId: string,
    nodeId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      await this.databaseService.prisma.notificationLog.create({
        data: {
          userId: userId,
          channel: 'email',
          status: data.status,
          error: data.error || null,
          notificationId: `${executionId}-${nodeId}`,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to log email activity: ${error.message}`);
      // Don't throw here as logging failure shouldn't stop execution
    }
  }
}
