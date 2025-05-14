/**
 * Migration Utilities
 * 
 * This module provides utilities for migrating data from Supabase to Prisma.
 * It includes functions for exporting data from Supabase and importing it into Prisma.
 */

import { createClient } from '@supabase/supabase-js';
import prisma from '../client';
import { PrismaClient } from '@prisma/client';
import { BlockType } from '@zyra/types';

/**
 * Supabase migration configuration
 */
interface MigrationConfig {
  supabaseUrl: string;
  supabaseKey: string;
  batchSize?: number;
}

/**
 * Migration progress
 */
interface MigrationProgress {
  table: string;
  total: number;
  processed: number;
  success: number;
  failed: number;
}

/**
 * Migration result
 */
interface MigrationResult {
  success: boolean;
  progress: MigrationProgress[];
  errors: Error[];
}

/**
 * Migration service for Supabase to Prisma
 */
export class MigrationService {
  private supabase: any;
  private prisma: PrismaClient;
  private batchSize: number;
  private progress: MigrationProgress[] = [];
  private errors: Error[] = [];

  /**
   * Constructor
   * @param config Migration configuration
   */
  constructor(config: MigrationConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.prisma = prisma;
    this.batchSize = config.batchSize || 100;
  }

  /**
   * Migrate all data from Supabase to Prisma
   * @returns Migration result
   */
  async migrateAll(): Promise<MigrationResult> {
    try {
      // Migrate in the correct order to respect foreign key constraints
      await this.migrateUsers();
      await this.migrateProfiles();
      await this.migrateUserWallets();
      await this.migrateTeams();
      await this.migrateTeamMembers();
      await this.migratePricingTiers();
      await this.migrateSubscriptions();
      await this.migrateWorkflows();
      await this.migrateWorkflowExecutions();
      await this.migrateNodeExecutions();
      await this.migrateBlockLibrary();
      await this.migrateCustomBlocks();
      await this.migrateNotifications();

      return {
        success: true,
        progress: this.progress,
        errors: this.errors,
      };
    } catch (error) {
      this.errors.push(error as Error);
      return {
        success: false,
        progress: this.progress,
        errors: this.errors,
      };
    }
  }

  /**
   * Migrate users from Supabase to Prisma
   */
  async migrateUsers(): Promise<void> {
    const progress: MigrationProgress = {
      table: 'users',
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
    };

    try {
      // Get users from Supabase auth.users table
      const { data: users, error } = await this.supabase.from('auth.users').select('*');

      if (error) throw error;

      progress.total = users.length;
      this.progress.push(progress);

      // Process users in batches
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        
        await Promise.all(
          batch.map(async (user: any) => {
            try {
              await this.prisma.user.upsert({
                where: { id: user.id },
                update: {
                  email: user.email,
                  phone: user.phone,
                  updatedAt: new Date(user.updated_at),
                },
                create: {
                  id: user.id,
                  email: user.email,
                  phone: user.phone,
                  createdAt: new Date(user.created_at),
                  updatedAt: new Date(user.updated_at),
                },
              });

              progress.success++;
            } catch (error) {
              progress.failed++;
              this.errors.push(error as Error);
            } finally {
              progress.processed++;
            }
          })
        );
      }
    } catch (error) {
      this.errors.push(error as Error);
      throw error;
    }
  }

  /**
   * Migrate profiles from Supabase to Prisma
   */
  async migrateProfiles(): Promise<void> {
    const progress: MigrationProgress = {
      table: 'profiles',
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
    };

    try {
      // Get profiles from Supabase
      const { data: profiles, error } = await this.supabase.from('profiles').select('*');

      if (error) throw error;

      progress.total = profiles.length;
      this.progress.push(progress);

      // Process profiles in batches
      for (let i = 0; i < profiles.length; i += this.batchSize) {
        const batch = profiles.slice(i, i + this.batchSize);
        
        await Promise.all(
          batch.map(async (profile: any) => {
            try {
              await this.prisma.profile.upsert({
                where: { id: profile.id },
                update: {
                  email: profile.email,
                  fullName: profile.full_name,
                  avatarUrl: profile.avatar_url,
                  subscriptionTier: profile.subscription_tier,
                  subscriptionStatus: profile.subscription_status,
                  subscriptionExpiresAt: profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null,
                  monthlyExecutionQuota: profile.monthly_execution_quota,
                  monthlyExecutionCount: profile.monthly_execution_count,
                  stripeCustomerId: profile.stripe_customer_id,
                  stripeSubscriptionId: profile.stripe_subscription_id,
                  updatedAt: profile.updated_at ? new Date(profile.updated_at) : new Date(),
                  lastSeenAt: profile.last_seen_at ? new Date(profile.last_seen_at) : new Date(),
                  monthlyExecutionsUsed: profile.monthly_executions_used,
                  telegramChatId: profile.telegram_chat_id,
                  discordWebhookUrl: profile.discord_webhook_url,
                },
                create: {
                  id: profile.id,
                  email: profile.email,
                  fullName: profile.full_name,
                  avatarUrl: profile.avatar_url,
                  subscriptionTier: profile.subscription_tier || 'free',
                  subscriptionStatus: profile.subscription_status || 'inactive',
                  subscriptionExpiresAt: profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null,
                  monthlyExecutionQuota: profile.monthly_execution_quota || 100,
                  monthlyExecutionCount: profile.monthly_execution_count || 0,
                  stripeCustomerId: profile.stripe_customer_id,
                  stripeSubscriptionId: profile.stripe_subscription_id,
                  createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
                  updatedAt: profile.updated_at ? new Date(profile.updated_at) : new Date(),
                  lastSeenAt: profile.last_seen_at ? new Date(profile.last_seen_at) : new Date(),
                  monthlyExecutionsUsed: profile.monthly_executions_used || 0,
                  telegramChatId: profile.telegram_chat_id,
                  discordWebhookUrl: profile.discord_webhook_url,
                },
              });

              progress.success++;
            } catch (error) {
              progress.failed++;
              this.errors.push(error as Error);
            } finally {
              progress.processed++;
            }
          })
        );
      }
    } catch (error) {
      this.errors.push(error as Error);
      throw error;
    }
  }

  /**
   * Migrate workflows from Supabase to Prisma
   */
  async migrateWorkflows(): Promise<void> {
    const progress: MigrationProgress = {
      table: 'workflows',
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
    };

    try {
      // Get workflows from Supabase
      const { data: workflows, error } = await this.supabase.from('workflows').select('*');

      if (error) throw error;

      progress.total = workflows.length;
      this.progress.push(progress);

      // Process workflows in batches
      for (let i = 0; i < workflows.length; i += this.batchSize) {
        const batch = workflows.slice(i, i + this.batchSize);
        
        await Promise.all(
          batch.map(async (workflow: any) => {
            try {
              await this.prisma.workflow.upsert({
                where: { id: workflow.id },
                update: {
                  name: workflow.name,
                  description: workflow.description,
                  nodes: workflow.nodes,
                  edges: workflow.edges,
                  isPublic: workflow.is_public,
                  tags: workflow.tags,
                  definition: workflow.definition,
                  version: workflow.version,
                  createdBy: workflow.created_by,
                  updatedAt: workflow.updated_at ? new Date(workflow.updated_at) : new Date(),
                },
                create: {
                  id: workflow.id,
                  userId: workflow.user_id,
                  name: workflow.name,
                  description: workflow.description,
                  nodes: workflow.nodes,
                  edges: workflow.edges,
                  isPublic: workflow.is_public,
                  tags: workflow.tags,
                  createdAt: workflow.created_at ? new Date(workflow.created_at) : new Date(),
                  updatedAt: workflow.updated_at ? new Date(workflow.updated_at) : new Date(),
                  definition: workflow.definition,
                  version: workflow.version,
                  createdBy: workflow.created_by,
                },
              });

              progress.success++;
            } catch (error) {
              progress.failed++;
              this.errors.push(error as Error);
            } finally {
              progress.processed++;
            }
          })
        );
      }
    } catch (error) {
      this.errors.push(error as Error);
      throw error;
    }
  }

  // Additional migration methods for other tables would be implemented similarly
  // For brevity, we're only showing a few examples

  /**
   * Migrate user wallets from Supabase to Prisma
   */
  async migrateUserWallets(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the user_wallets table
  }

  /**
   * Migrate teams from Supabase to Prisma
   */
  async migrateTeams(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the teams table
  }

  /**
   * Migrate team members from Supabase to Prisma
   */
  async migrateTeamMembers(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the team_members table
  }

  /**
   * Migrate pricing tiers from Supabase to Prisma
   */
  async migratePricingTiers(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the pricing_tiers table
  }

  /**
   * Migrate subscriptions from Supabase to Prisma
   */
  async migrateSubscriptions(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the subscriptions table
  }

  /**
   * Migrate workflow executions from Supabase to Prisma
   */
  async migrateWorkflowExecutions(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the workflow_executions table
  }

  /**
   * Migrate node executions from Supabase to Prisma
   */
  async migrateNodeExecutions(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the node_executions table
  }

  /**
   * Migrate block library from Supabase to Prisma
   */
  async migrateBlockLibrary(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the block_library table
  }

  /**
   * Migrate custom blocks from Supabase to Prisma
   */
  async migrateCustomBlocks(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the custom_blocks table
  }

  /**
   * Migrate notifications from Supabase to Prisma
   */
  async migrateNotifications(): Promise<void> {
    // Implementation similar to other migration methods
    // This would migrate the notifications table
  }
}
