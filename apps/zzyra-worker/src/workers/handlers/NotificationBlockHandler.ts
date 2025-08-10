import {
  EnhancedBlockHandler,
  EnhancedBlockDefinition,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  BlockGroup,
  ConnectionType,
  PropertyType,
  ValidationResult,
} from '@zzyra/types';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class NotificationBlockHandler implements EnhancedBlockHandler {
  private readonly logger = new Logger(NotificationBlockHandler.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'Notification',
    name: 'NOTIFICATION',
    version: 1,
    description:
      'Send notifications via multiple channels (email, webhook, etc.)',
    icon: 'bell',
    color: '#10B981',
    group: [BlockGroup.ACTION],
    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    properties: [
      {
        displayName: 'Notification Type',
        name: 'notificationType',
        type: PropertyType.OPTIONS,
        required: true,
        default: 'email',
        description: 'Type of notification to send',
        options: [
          { name: 'Email', value: 'email' },
          { name: 'Webhook', value: 'webhook' },
          { name: 'Discord', value: 'discord' },
          { name: 'Slack', value: 'slack' },
          { name: 'Telegram', value: 'telegram' },
        ],
      },
      {
        displayName: 'Email Provider',
        name: 'emailProvider',
        type: PropertyType.OPTIONS,
        description: 'Email service provider to use',
        default: 'smtp',
        displayOptions: {
          show: {
            notificationType: ['email'],
          },
        },
        options: [
          { name: 'SMTP', value: 'smtp' },
          { name: 'SendGrid', value: 'sendgrid' },
          { name: 'AWS SES', value: 'ses' },
          { name: 'Gmail', value: 'gmail' },
        ],
      },
      {
        displayName: 'To',
        name: 'to',
        type: PropertyType.STRING,
        required: true,
        description:
          'Recipient email address. Supports template variables like {{json.email}}',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['email'],
          },
        },
      },
      {
        displayName: 'Subject',
        name: 'subject',
        type: PropertyType.STRING,
        required: true,
        description:
          'Email subject line. Supports template variables like {{json.subject}}',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['email'],
          },
        },
      },
      {
        displayName: 'Body',
        name: 'body',
        type: PropertyType.STRING,
        required: true,
        description:
          'Email body content. Supports template variables like {{json.message}}',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['email'],
          },
        },
        typeOptions: {
          rows: 8,
        },
      },
      {
        displayName: 'CC',
        name: 'cc',
        type: PropertyType.STRING,
        description:
          'CC recipients (comma-separated). Supports template variables',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['email'],
          },
        },
      },
      {
        displayName: 'BCC',
        name: 'bcc',
        type: PropertyType.STRING,
        description:
          'BCC recipients (comma-separated). Supports template variables',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['email'],
          },
        },
      },
      {
        displayName: 'HTML Format',
        name: 'htmlFormat',
        type: PropertyType.BOOLEAN,
        description: 'Send email in HTML format',
        default: true,
        displayOptions: {
          show: {
            notificationType: ['email'],
          },
        },
      },
      {
        displayName: 'Webhook URL',
        name: 'webhookUrl',
        type: PropertyType.STRING,
        required: true,
        description: 'Webhook endpoint URL. Supports template variables',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['webhook'],
          },
        },
      },
      {
        displayName: 'Webhook Method',
        name: 'webhookMethod',
        type: PropertyType.OPTIONS,
        description: 'HTTP method for webhook',
        default: 'POST',
        displayOptions: {
          show: {
            notificationType: ['webhook'],
          },
        },
        options: [
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
        ],
      },
      {
        displayName: 'Webhook Headers',
        name: 'webhookHeaders',
        type: PropertyType.COLLECTION,
        description: 'Headers to include in webhook request',
        default: {},
        displayOptions: {
          show: {
            notificationType: ['webhook'],
          },
        },
        typeOptions: {
          multipleValues: true,
        },
      },
      {
        displayName: 'Discord Webhook URL',
        name: 'discordWebhookUrl',
        type: PropertyType.STRING,
        required: true,
        description: 'Discord webhook URL',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['discord'],
          },
        },
      },
      {
        displayName: 'Slack Webhook URL',
        name: 'slackWebhookUrl',
        type: PropertyType.STRING,
        required: true,
        description: 'Slack webhook URL',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['slack'],
          },
        },
      },
      {
        displayName: 'Telegram Bot Token',
        name: 'telegramBotToken',
        type: PropertyType.STRING,
        required: true,
        description: 'Telegram bot token',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['telegram'],
          },
        },
        typeOptions: {
          password: true,
        },
      },
      {
        displayName: 'Telegram Chat ID',
        name: 'telegramChatId',
        type: PropertyType.STRING,
        required: true,
        description: 'Telegram chat ID',
        default: '',
        displayOptions: {
          show: {
            notificationType: ['telegram'],
          },
        },
      },
    ],

    documentation: {
      examples: [
        {
          name: 'Email Notification',
          description: 'Send email notification with template variables',
          workflow: {
            nodes: [
              {
                parameters: {
                  notificationType: 'email',
                  to: '{{json.email}}',
                  subject: 'Alert: {{json.title}}',
                  body: 'Hello {{json.name}}, {{json.message}}',
                  htmlFormat: true,
                },
              },
            ],
          },
        },
        {
          name: 'Discord Webhook',
          description: 'Send notification to Discord channel',
          workflow: {
            nodes: [
              {
                parameters: {
                  notificationType: 'discord',
                  discordWebhookUrl: 'https://discord.com/api/webhooks/...',
                },
              },
            ],
          },
        },
      ],
      resources: [
        {
          url: 'https://nodemailer.com/',
          text: 'Nodemailer Documentation',
        },
      ],
    },
  };

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    context.logger.info('NotificationBlockHandler started');
    const inputData = context.getInputData();
    const returnData: ZyraNodeData[] = [];

    // If no input data, create a single empty item
    const items = inputData.length > 0 ? inputData : [{ json: {} }];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];

      try {
        // Get node parameters
        const notificationType = context.getNodeParameter(
          'notificationType',
          itemIndex,
        ) as string;

        context.logger.info(`Executing ${notificationType} notification`);

        let result: any;

        switch (notificationType) {
          case 'email':
            result = await this.sendEmail(context, itemIndex, item);
            break;
          case 'webhook':
            result = await this.sendWebhook(context, itemIndex, item);
            break;
          case 'discord':
            result = await this.sendDiscord(context, itemIndex, item);
            break;
          case 'slack':
            result = await this.sendSlack(context, itemIndex, item);
            break;
          case 'telegram':
            result = await this.sendTelegram(context, itemIndex, item);
            break;
          default:
            throw new Error(
              `Unsupported notification type: ${notificationType}`,
            );
        }

        // Create output data
        const outputData: ZyraNodeData = {
          json: {
            success: true,
            notificationType,
            result,
            timestamp: new Date().toISOString(),
          },
        };

        returnData.push(outputData);

        context.logger.info(
          `${notificationType} notification sent successfully`,
          {
            executionId: context.executionId,
          },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'UnknownError';

        context.logger.error(`Notification failed for item ${itemIndex}`, {
          error: errorMessage,
          executionId: context.executionId,
        });

        // Create error output for debugging and UI display
        const errorOutput: ZyraNodeData = {
          json: {
            success: false,
            notificationType: 'unknown',
            error: errorMessage,
            timestamp: new Date().toISOString(),
          },
          error: {
            message: errorMessage,
            name: errorName,
            timestamp: new Date().toISOString(),
            context: { itemIndex },
          },
        };

        returnData.push(errorOutput);

        // CRITICAL: Also throw the error to fail the workflow
        // This ensures the workflow stops while preserving error information
        throw new Error(`Notification failed: ${errorMessage}`);
      }
    }

    return returnData;
  }

  private async sendEmail(
    context: EnhancedBlockExecutionContext,
    itemIndex: number,
    item: ZyraNodeData,
  ): Promise<any> {
    // Validate email configuration
    this.validateEmailConfig();

    // Get email parameters
    const to = context.getNodeParameter('to', itemIndex) as string;
    const subject = context.getNodeParameter('subject', itemIndex) as string;
    const body = context.getNodeParameter('body', itemIndex) as string;
    const cc = context.getNodeParameter('cc', itemIndex) as string;
    const bcc = context.getNodeParameter('bcc', itemIndex) as string;
    const htmlFormat = context.getNodeParameter(
      'htmlFormat',
      itemIndex,
    ) as boolean;

    // Validate required fields
    if (!to) {
      throw new Error('Email recipient is required');
    }
    if (!subject) {
      throw new Error('Email subject is required');
    }
    if (!body) {
      throw new Error('Email body is required');
    }

    // Process template variables with enhanced cross-block data access
    const processedTo = context.helpers.processTemplate(to, item.json);
    const processedSubject = context.helpers.processTemplate(
      subject,
      item.json,
    );
    const processedBody = context.helpers.processTemplate(body, item.json);
    const processedCc = cc
      ? context.helpers.processTemplate(cc, item.json)
      : undefined;
    const processedBcc = bcc
      ? context.helpers.processTemplate(bcc, item.json)
      : undefined;

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
      to: processedTo,
      subject: processedSubject,
      text: htmlFormat ? undefined : processedBody,
      html: htmlFormat ? processedBody : undefined,
      cc: processedCc,
      bcc: processedBcc,
    };

    const result = await transporter.sendMail(mailOptions);

    // Log successful email send
    await this.logNotificationSent(
      context.userId,
      context.executionId,
      context.nodeId,
      {
        type: 'email',
        to: processedTo,
        subject: processedSubject,
        messageId: result.messageId,
        status: 'sent',
      },
    );

    return {
      messageId: result.messageId,
      envelope: result.envelope,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }

  private async sendWebhook(
    context: EnhancedBlockExecutionContext,
    itemIndex: number,
    item: ZyraNodeData,
  ): Promise<any> {
    const url = context.getNodeParameter('webhookUrl', itemIndex) as string;
    const method = context.getNodeParameter(
      'webhookMethod',
      itemIndex,
    ) as string;
    const headers = context.getNodeParameter(
      'webhookHeaders',
      itemIndex,
    ) as Record<string, string>;

    if (!url) {
      throw new Error('Webhook URL is required');
    }

    // Process template variables
    const processedUrl = context.helpers.processTemplate(url, item.json);
    const processedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers || {})) {
      processedHeaders[key] = context.helpers.processTemplate(value, item.json);
    }

    // Send webhook
    const response = await fetch(processedUrl, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...processedHeaders,
      },
      body: JSON.stringify(item.json),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook failed: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    return {
      statusCode: response.status,
      data: result,
    };
  }

  private async sendDiscord(
    context: EnhancedBlockExecutionContext,
    itemIndex: number,
    item: ZyraNodeData,
  ): Promise<any> {
    const webhookUrl = context.getNodeParameter(
      'discordWebhookUrl',
      itemIndex,
    ) as string;

    if (!webhookUrl) {
      throw new Error('Discord webhook URL is required');
    }

    // Process template variables
    const processedUrl = context.helpers.processTemplate(webhookUrl, item.json);
    const message = context.helpers.processTemplate(
      '{{json.message}}',
      item.json,
    );

    // Send Discord webhook
    const response = await fetch(processedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        embeds: item.json.embeds || [],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Discord webhook failed: ${response.status} ${response.statusText}`,
      );
    }

    return {
      statusCode: response.status,
    };
  }

  private async sendSlack(
    context: EnhancedBlockExecutionContext,
    itemIndex: number,
    item: ZyraNodeData,
  ): Promise<any> {
    const webhookUrl = context.getNodeParameter(
      'slackWebhookUrl',
      itemIndex,
    ) as string;

    if (!webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }

    // Process template variables
    const processedUrl = context.helpers.processTemplate(webhookUrl, item.json);
    const message = context.helpers.processTemplate(
      '{{json.message}}',
      item.json,
    );

    // Send Slack webhook
    const response = await fetch(processedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Slack webhook failed: ${response.status} ${response.statusText}`,
      );
    }

    return {
      statusCode: response.status,
    };
  }

  private async sendTelegram(
    context: EnhancedBlockExecutionContext,
    itemIndex: number,
    item: ZyraNodeData,
  ): Promise<any> {
    const botToken = context.getNodeParameter(
      'telegramBotToken',
      itemIndex,
    ) as string;
    const chatId = context.getNodeParameter(
      'telegramChatId',
      itemIndex,
    ) as string;

    if (!botToken) {
      throw new Error('Telegram bot token is required');
    }
    if (!chatId) {
      throw new Error('Telegram chat ID is required');
    }

    // Process template variables
    const processedChatId = context.helpers.processTemplate(chatId, item.json);
    const message = context.helpers.processTemplate(
      '{{json.message}}',
      item.json,
    );

    // Send Telegram message
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: processedChatId,
          text: message,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Telegram message failed: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    return {
      messageId: result.result?.message_id,
      chatId: processedChatId,
    };
  }

  private validateEmailConfig(): void {
    if (!process.env.SMTP_HOST) {
      throw new Error('SMTP_HOST environment variable is required');
    }
    if (!process.env.SMTP_USER) {
      throw new Error('SMTP_USER environment variable is required');
    }
    if (!process.env.SMTP_PASS) {
      throw new Error('SMTP_PASS environment variable is required');
    }
  }

  private async logNotificationSent(
    userId: string,
    executionId: string,
    nodeId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      await this.databaseService.prisma.executionLog.create({
        data: {
          executionId,
          level: 'info',
          message: 'Notification sent successfully',
          metadata: data,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate notification type
    if (!config.notificationType) {
      errors.push('Notification type is required');
    }

    // Validate based on notification type
    switch (config.notificationType) {
      case 'email':
        if (!config.to) {
          errors.push('Email recipient is required');
        }
        if (!config.subject) {
          errors.push('Email subject is required');
        }
        if (!config.body) {
          errors.push('Email body is required');
        }
        break;

      case 'webhook':
        if (!config.webhookUrl) {
          errors.push('Webhook URL is required');
        }
        break;

      case 'discord':
        if (!config.discordWebhookUrl) {
          errors.push('Discord webhook URL is required');
        }
        break;

      case 'slack':
        if (!config.slackWebhookUrl) {
          errors.push('Slack webhook URL is required');
        }
        break;

      case 'telegram':
        if (!config.telegramBotToken) {
          errors.push('Telegram bot token is required');
        }
        if (!config.telegramChatId) {
          errors.push('Telegram chat ID is required');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
