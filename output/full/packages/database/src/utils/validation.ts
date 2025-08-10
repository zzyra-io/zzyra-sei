/**
 * Validation Utilities
 * 
 * This module provides utilities for validating data before database operations.
 * It integrates with Zod schemas from @zzyra/types for consistent validation.
 */

import { z } from 'zod';
import { BlockType, NodeCategory } from '@zzyra/types';

/**
 * Validate workflow data
 * @param data The workflow data to validate
 * @returns The validated data or throws an error
 */
export function validateWorkflow(data: any) {
  const workflowSchema = z.object({
    name: z.string().min(1, 'Workflow name is required'),
    description: z.string().optional(),
    nodes: z.any().optional(),
    edges: z.any().optional(),
    isPublic: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    definition: z.any(),
    version: z.number().int().positive().default(1),
  });

  return workflowSchema.parse(data);
}

/**
 * Validate node data
 * @param data The node data to validate
 * @returns The validated data or throws an error
 */
export function validateNode(data: any) {
  const nodeSchema = z.object({
    id: z.string().min(1, 'Node ID is required'),
    type: z.nativeEnum(BlockType),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    data: z.any(),
  });

  return nodeSchema.parse(data);
}

/**
 * Validate edge data
 * @param data The edge data to validate
 * @returns The validated data or throws an error
 */
export function validateEdge(data: any) {
  const edgeSchema = z.object({
    id: z.string().min(1, 'Edge ID is required'),
    source: z.string().min(1, 'Source node ID is required'),
    target: z.string().min(1, 'Target node ID is required'),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
  });

  return edgeSchema.parse(data);
}

/**
 * Validate user data
 * @param data The user data to validate
 * @returns The validated data or throws an error
 */
export function validateUser(data: any) {
  const userSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  });

  return userSchema.parse(data);
}

/**
 * Validate profile data
 * @param data The profile data to validate
 * @returns The validated data or throws an error
 */
export function validateProfile(data: any) {
  const profileSchema = z.object({
    fullName: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    subscriptionTier: z.string().default('free'),
    subscriptionStatus: z.string().default('inactive'),
    monthlyExecutionQuota: z.number().int().positive().default(100),
    monthlyExecutionCount: z.number().int().nonnegative().default(0),
    stripeCustomerId: z.string().optional(),
    stripeSubscriptionId: z.string().optional(),
    telegramChatId: z.string().optional(),
    discordWebhookUrl: z.string().url().optional(),
  });

  return profileSchema.parse(data);
}

/**
 * Validate wallet data
 * @param data The wallet data to validate
 * @returns The validated data or throws an error
 */
export function validateWallet(data: any) {
  const walletSchema = z.object({
    walletAddress: z.string().min(1, 'Wallet address is required'),
    chainId: z.string().min(1, 'Chain ID is required'),
    chainType: z.string().min(1, 'Chain type is required'),
    walletType: z.string().optional(),
    metadata: z.any().optional(),
  });

  return walletSchema.parse(data);
}

/**
 * Validate execution data
 * @param data The execution data to validate
 * @returns The validated data or throws an error
 */
export function validateExecution(data: any) {
  const executionSchema = z.object({
    workflowId: z.string().min(1, 'Workflow ID is required'),
    userId: z.string().min(1, 'User ID is required'),
    input: z.any().optional(),
    triggerType: z.string().optional(),
    triggerData: z.any().optional(),
  });

  return executionSchema.parse(data);
}

/**
 * Validate block data
 * @param data The block data to validate
 * @returns The validated data or throws an error
 */
export function validateBlock(data: any) {
  const blockSchema = z.object({
    name: z.string().min(1, 'Block name is required'),
    description: z.string().optional(),
    blockType: z.nativeEnum(BlockType),
    category: z.nativeEnum(NodeCategory).optional(),
    definition: z.any(),
    isPublic: z.boolean().optional(),
  });

  return blockSchema.parse(data);
}

/**
 * Validate subscription data
 * @param data The subscription data to validate
 * @returns The validated data or throws an error
 */
export function validateSubscription(data: any) {
  const subscriptionSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    tierId: z.string().min(1, 'Tier ID is required'),
    status: z.string().min(1, 'Status is required'),
    currentPeriodStart: z.date(),
    currentPeriodEnd: z.date(),
    cancelAtPeriodEnd: z.boolean().default(false),
    stripeSubscriptionId: z.string().optional(),
    stripePriceId: z.string().optional(),
    stripeCustomerId: z.string().optional(),
  });

  return subscriptionSchema.parse(data);
}
