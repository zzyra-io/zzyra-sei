import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import * as nodemailer from 'nodemailer';
import { ZyraTemplateProcessor } from '../../utils/template-processor';

@Injectable()
export class EmailBlockHandler implements BlockHandler {
  private readonly logger = new Logger(EmailBlockHandler.name);
  private readonly templateProcessor = new ZyraTemplateProcessor();

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId, executionId, userId } = ctx;
    const config = (node.data as any).config;

    this.logger.log(`Executing Email block: ${nodeId}`);

    try {
      // Validate required email configuration
      this.validateEmailConfig();

      // Validate required fields
      if (!config.to) {
        throw new Error('Email recipient is required');
      }
      if (!config.subject) {
        throw new Error('Email subject is required');
      }
      if (!config.body) {
        throw new Error('Email body is required');
      }

      // Create email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Process email template variables from previous node outputs using unified template processor
      let emailBody = config.body;
      let emailSubject = config.subject;

      // If we have previous outputs from the workflow, use them for template substitution
      if (ctx.previousOutputs && Object.keys(ctx.previousOutputs).length > 0) {
        emailBody = this.templateProcessor.process(
          emailBody,
          ctx.previousOutputs,
        );
        emailSubject = this.templateProcessor.process(
          emailSubject,
          ctx.previousOutputs,
        );
      }

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: config.to,
        subject: emailSubject,
        html: emailBody,
        cc: config.cc || undefined,
      };

      const result = await transporter.sendMail(mailOptions);

      // Log successful email send
      await this.logEmailSent(userId, executionId, nodeId, {
        to: config.to,
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
        to: config.to || 'unknown',
        subject: config.subject || 'unknown',
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
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required email configuration: ${missingVars.join(', ')}`,
      );
    }
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
