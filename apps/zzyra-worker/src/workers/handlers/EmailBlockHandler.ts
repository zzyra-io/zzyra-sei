import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zzyra/types';
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
    this.logger.debug(`Email config:`, JSON.stringify(config, null, 2));
    this.logger.debug(
      `Previous outputs:`,
      JSON.stringify(ctx.previousOutputs, null, 2),
    );

    // Initialize template variables at function scope for proper error handling
    let emailBody = config.body || '';
    let emailSubject = config.subject || '';
    let emailTo = config.to || '';
    let emailCc = config.cc || '';

    try {
      // Validate required email configuration
      this.validateEmailConfig();

      // Create enhanced context for cross-block template processing
      const templateContext = {
        previousOutputs: ctx.previousOutputs || {},
        blockOutputs: ctx.previousOutputs || {},
        currentNode: config,
      };

      this.logger.debug('Template processing context:', {
        previousOutputsKeys: Object.keys(ctx.previousOutputs || {}),
        templateContext: templateContext,
      });

      // Process templates BEFORE validation - this is critical!
      if (ctx.previousOutputs && Object.keys(ctx.previousOutputs).length > 0) {
        this.logger.debug('Processing templates with previous outputs');
        this.logger.debug(
          'Previous outputs structure:',
          JSON.stringify(ctx.previousOutputs, null, 2),
        );

        // Process recipient email with enhanced context
        this.logger.debug(`[EMAIL] Processing emailTo template: "${emailTo}"`);
        emailTo = this.templateProcessor.process(
          emailTo,
          ctx.previousOutputs,
          templateContext,
        );
        this.logger.debug(`[EMAIL] Processed emailTo: "${emailTo}"`);

        // Process subject with enhanced context
        this.logger.debug(
          `[EMAIL] Processing emailSubject template: "${emailSubject}"`,
        );
        emailSubject = this.templateProcessor.process(
          emailSubject,
          ctx.previousOutputs,
          templateContext,
        );
        this.logger.debug(`[EMAIL] Processed emailSubject: "${emailSubject}"`);

        // Process body with enhanced context
        this.logger.debug(
          `[EMAIL] Processing emailBody template (first 200 chars): "${emailBody.substring(0, 200)}..."`,
        );
        emailBody = this.templateProcessor.process(
          emailBody,
          ctx.previousOutputs,
          templateContext,
        );
        this.logger.debug(
          `[EMAIL] Processed emailBody length: ${emailBody.length}`,
        );
        this.logger.debug(
          `[EMAIL] Processed emailBody preview: "${emailBody.substring(0, 200)}..."`,
        );

        // Process CC if provided
        if (emailCc) {
          this.logger.debug(
            `[EMAIL] Processing emailCc template: "${emailCc}"`,
          );
          emailCc = this.templateProcessor.process(
            emailCc,
            ctx.previousOutputs,
            templateContext,
          );
          this.logger.debug(`[EMAIL] Processed emailCc: "${emailCc}"`);
        }
      } else {
        this.logger.debug(
          'No previous outputs available for template processing',
        );
      }

      // Validate required fields AFTER template processing
      if (!emailTo || emailTo.trim() === '') {
        throw new Error('Email recipient is required');
      }
      if (!emailSubject || emailSubject.trim() === '') {
        throw new Error('Email subject is required');
      }
      if (!emailBody || emailBody.trim() === '') {
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

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: emailTo, // Use processed email address
        subject: emailSubject,
        html: emailBody,
        cc: emailCc || undefined,
      };

      this.logger.log('Sending email with options:', {
        to: emailTo,
        subject: emailSubject,
        bodyLength: emailBody.length,
        cc: emailCc,
      });

      const result = await transporter.sendMail(mailOptions);

      // Log successful email send
      await this.logEmailSent(userId, executionId, nodeId, {
        to: emailTo, // Use processed email address
        subject: emailSubject,
        messageId: result.messageId,
        status: 'sent',
      });

      // Return structured output for EMAIL block
      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        recipient: emailTo,
        subject: emailSubject,
        status: 'sent',
        data: {
          messageId: result.messageId,
          envelope: result.envelope,
          accepted: result.accepted,
          rejected: result.rejected,
        },
        // Additional fields for template consumption
        to: emailTo,
        body: emailBody,
        cc: emailCc,
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      };
    } catch (error: any) {
      this.logger.error(`Email sending failed: ${error.message}`);

      // Log failed email attempt
      await this.logEmailSent(userId, executionId, nodeId, {
        to: emailTo || config.to || 'unknown',
        subject: emailSubject || config.subject || 'unknown',
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
