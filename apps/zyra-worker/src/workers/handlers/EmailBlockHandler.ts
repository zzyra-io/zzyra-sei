
import nodemailer, { Transporter } from 'nodemailer';

import sanitizeHtml from 'sanitize-html'; // For sanitizing email content
import { Logger } from '@nestjs/common'; // NestJS logger
import { z } from 'zod'; // For runtime validation
import { configDotenv } from 'dotenv';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';


configDotenv();

// Define the schema for blkCfg using Zod
const BlkCfgSchema = z.object({
  to: z.string().email().nonempty('Recipient email is required'),
  body: z.string().nonempty('Email body is required'),
  subject: z.string().nonempty('Email subject is required'),
  template: z.string().optional().default('notification'),
  asset: z.string().optional(),
  condition: z.enum(['above', 'below']).optional(),
  dataSource: z.string().optional(),
  maxRetries: z.string().transform(Number).default('3'),
  retryDelay: z.string().transform(Number).default('30'),
  targetPrice: z.string().optional(),
  checkInterval: z.string().optional(),
  retryOnFailure: z.boolean().default(true),
  notifyOnTrigger: z.boolean().default(true),
  comparisonPeriod: z.string().optional(),
  includeWorkflowData: z.boolean().default(true),
  historicalComparison: z.string().optional(),
});

// Define the type for blkCfg based on the schema
type BlkCfg = z.infer<typeof BlkCfgSchema>;

// Environment variable validation
const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`,
  );
}

export class EmailBlockHandler implements BlockHandler {
  private transporter: Transporter;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      secure: Number(process.env.SMTP_PORT!) === 465, // Use SSL for port 465
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }

  private sanitizeContent(content: string): string {
    return sanitizeHtml(content, {
      allowedTags: [], // Strip all HTML tags for plain text emails
      allowedAttributes: {},
    });
  }

  private async sendEmailWithRetry(
    mailOptions: nodemailer.SendMailOptions,
    maxRetries: number,
    retryDelay: number,
  ): Promise<any> {
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        this.logger.log(`Sending email, attempt ${attempt}`, {
          to: mailOptions.to,
        });
        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log('Email sent successfully', {
          messageId: info.messageId,
        });
        return { messageId: info.messageId };
      } catch (error: any) {
        this.logger.error(`Failed to send email on attempt ${attempt}`, {
          error: error.message,
          to: mailOptions.to,
        });

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to send email after ${maxRetries} attempts: ${error.message}`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay * 1000));
        attempt++;
      }
    }
  }

  private renderTemplate(blkCfg: BlkCfg, ctx: BlockExecutionContext): string {
    // Basic template rendering logic (extend as needed)
    let body = blkCfg.body;
    if (blkCfg.template === 'notification' && blkCfg.includeWorkflowData) {
      body += `\n\nWorkflow Context:\nAsset: ${blkCfg.asset || 'N/A'}\nTarget Price: ${blkCfg.targetPrice || 'N/A'}\n`;
      if (ctx.workflowData) {
        body += `Workflow Data: ${JSON.stringify(ctx.workflowData, null, 2)}\n`;
      }
    }
    return this.sanitizeContent(body);
  }

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    // Validate blkCfg
    const cfg = node.data as Record<string, any>;
    if (!cfg.config) {
      throw new Error('Configuration is missing in node data');
    }

    const parseResult = BlkCfgSchema.safeParse(cfg.config);
    if (!parseResult.success) {
      this.logger.error('Invalid configuration', {
        errors: parseResult.error.errors,
      });
      throw new Error(`Invalid configuration: ${parseResult.error.message}`);
    }

    const blkCfg: BlkCfg = parseResult.data;

    // Prepare email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_FROM!,
      to: blkCfg.to,
      subject: this.sanitizeContent(blkCfg.subject),
      text: this.renderTemplate(blkCfg, ctx),
    };

    // Send email with retry logic if enabled
    if (blkCfg.retryOnFailure) {
      return await this.sendEmailWithRetry(
        mailOptions,
        blkCfg.maxRetries,
        blkCfg.retryDelay,
      );
    } else {
      this.logger.log('Sending email without retry', { to: blkCfg.to });
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log('Email sent successfully', {
        messageId: info.messageId,
      });
      return { messageId: info.messageId };
    }
  }
}
