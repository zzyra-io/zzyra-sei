import { z } from 'zod';

export const scheduleConfigSchema = z.object({
  timezone: z.string(),
  cronExpression: z.string(),
});

export const databaseConfigSchema = z.object({
  database: z.string().url(),
  operation: z.enum(['backup', 'select', 'insert', 'update', 'delete']),
});

export const notificationConfigSchema = z.object({
  type: z.enum(['success', 'error', 'info', 'warning']),
  title: z.string(),
  message: z.string(),
});

export const priceMonitorConfigSchema = z.object({
  asset: z.string(),
  targetPrice: z.number(),
  condition: z.enum(['above', 'below', 'equals']).default('above'),
});

export const emailConfigSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

export const nodeConfigSchema = z.union([
  z.object({ blockType: z.literal('schedule'), config: scheduleConfigSchema }),
  z.object({ blockType: z.literal('database'), config: databaseConfigSchema }),
  z.object({ blockType: z.literal('notification'), config: notificationConfigSchema }),
  z.object({ blockType: z.literal('price-monitor'), config: priceMonitorConfigSchema }),
  z.object({ blockType: z.literal('email'), config: emailConfigSchema }),
]);
