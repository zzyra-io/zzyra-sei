import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class EmailBlockHandler implements BlockHandler {
  private readonly logger = new Logger(EmailBlockHandler.name);

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

      // Process email template variables from previous node outputs
      let emailBody = config.body;
      let emailSubject = config.subject;

      // If we have previous outputs from the workflow, use them for template substitution
      if (ctx.previousOutputs && Object.keys(ctx.previousOutputs).length > 0) {
        emailBody = this.processTemplateVariables(
          emailBody,
          ctx.previousOutputs,
        );
        emailSubject = this.processTemplateVariables(
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
   * Process template variables in email content
   * Handles specialized formatting for different variable types
   */
  private processTemplateVariables(
    template: string,
    variables: Record<string, any>,
  ): string {
    let processed = template;

    // Process nested objects (like PriceMonitor results)
    const flattenedVars = this.flattenVariables(variables);

    // Replace template variables like {{variableName}}
    for (const [key, value] of Object.entries(flattenedVars)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');

      // Skip undefined/null values
      if (value === undefined || value === null) continue;

      // Format values appropriately
      let formattedValue: string;

      if (typeof value === 'number') {
        // Format numbers as currency if they seem to be monetary values
        const isLikelyPrice =
          key.toLowerCase().includes('price') ||
          key.toLowerCase().includes('amount') ||
          key.toLowerCase().includes('value');

        formattedValue = isLikelyPrice
          ? `$${value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : value.toString();
      } else if (value instanceof Date) {
        formattedValue = value.toLocaleString();
      } else {
        formattedValue = String(value);
      }

      processed = processed.replace(placeholder, formattedValue);
    }

    // Add current timestamp if {{timestamp}} is used
    const timestampRegex = /{{\\s*timestamp\\s*}}/g;
    processed = processed.replace(
      timestampRegex,
      new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }),
    );

    // Add standard email footer if none exists
    if (!processed.includes('Powered by Zzyra')) {
      processed += '\n\n--\nPowered by Zzyra | Automated Workflows';
    }

    return processed;
  }

  /**
   * Flatten nested objects for template processing
   * Converts {a: {b: 1}} to {'a.b': 1}
   */
  private flattenVariables(
    obj: Record<string, any>,
    prefix = '',
  ): Record<string, any> {
    let result: Record<string, any> = {};

    // Special handling for PriceMonitor output
    if (obj.asset && obj.currentPrice) {
      // Add simplified access to common price data
      result['asset'] = obj.asset;
      result['price'] = obj.currentPrice;
      result['formattedPrice'] = `$${obj.currentPrice.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      )}`;
    }

    // Handle formatted fields specifically (from PriceMonitorBlockHandler)
    if (obj.formatted) {
      for (const [key, value] of Object.entries(obj.formatted)) {
        result[key] = value;
      }
    }

    // Process all properties
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        const nested = this.flattenVariables(
          value as Record<string, any>,
          newKey,
        );
        result = { ...result, ...nested };
      } else {
        // Add simple values
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * Validate email configuration
   */
  private validateEmailConfig(): void {
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
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
