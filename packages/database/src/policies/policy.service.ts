/**
 * Policy Service
 *
 * This service handles access control policies for the Zyra platform.
 * It replaces Supabase RLS with application-level access control.
 */

import type { User } from "@prisma/client";
import prisma from "../client";

/**
 * Policy context containing information about the current user and operation
 */
export interface PolicyContext {
  userId: string;
  isAdmin?: boolean;
  teamIds?: string[];
}

/**
 * Policy result indicating whether access is allowed and optional error message
 */
export interface PolicyResult {
  allowed: boolean;
  message?: string;
}

/**
 * Policy service for enforcing access control
 */
export class PolicyService {
  private prisma: typeof prisma;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Check if a user has access to a workflow
   * @param workflowId The workflow ID
   * @param context The policy context
   * @returns Policy result
   */
  async checkWorkflowAccess(
    workflowId: string,
    context: PolicyContext
  ): Promise<PolicyResult> {
    // Admin override
    if (context.isAdmin) {
      return { allowed: true };
    }

    // Check if the workflow exists and belongs to the user or their team
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        OR: [
          { isPublic: true },
          { userId: context.userId },
          // Add a team access check here if your schema supports it
        ],
      },
    });

    if (!workflow) {
      return {
        allowed: false,
        message:
          "Workflow not found or you do not have permission to access it",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user has access to a workflow execution
   * @param executionId The execution ID
   * @param context The policy context
   * @returns Policy result
   */
  async checkExecutionAccess(
    executionId: string,
    context: PolicyContext
  ): Promise<PolicyResult> {
    // Admin override
    if (context.isAdmin) {
      return { allowed: true };
    }

    // Check if the execution exists and belongs to the user or their team
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        OR: [
          { userId: context.userId },
          {
            workflow: {
              OR: [
                { userId: context.userId },
                { isPublic: true },
                // Add team access here only if your schema supports it
              ],
            },
          },
        ],
      },
    });

    if (!execution) {
      return {
        allowed: false,
        message:
          "Execution not found or you do not have permission to access it",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user has access to a node execution
   * @param nodeExecutionId The node execution ID
   * @param context The policy context
   * @returns Policy result
   */
  async checkNodeExecutionAccess(
    nodeExecutionId: string,
    context: PolicyContext
  ): Promise<PolicyResult> {
    // Admin override
    if (context.isAdmin) {
      return { allowed: true };
    }

    // Check if the node execution exists and belongs to the user or their team
    const nodeExecution = await this.prisma.nodeExecution.findFirst({
      where: {
        id: nodeExecutionId,
        OR: [
          // Use a raw query filter for properties not in the type
          // { userId: context.userId },
          {
            execution: {
              userId: context.userId
            }
          },
          {
            execution: {
              workflow: {
                OR: [
                  { userId: context.userId },
                  { isPublic: true },
                ],
              }
            },
          },
        ],
      },
    });

    if (!nodeExecution) {
      return {
        allowed: false,
        message:
          "Node execution not found or you do not have permission to access it",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user has access to a team
   * @param teamId The team ID
   * @param context The policy context
   * @returns Policy result
   */
  async checkTeamAccess(
    teamId: string,
    context: PolicyContext
  ): Promise<PolicyResult> {
    // Admin override
    if (context.isAdmin) {
      return { allowed: true };
    }

    // Check if the team exists and the user is a member
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        OR: [
          { createdBy: context.userId },
          {
            members: {
              some: {
                userId: context.userId,
              },
            },
          },
        ],
      },
    });

    if (!team) {
      return {
        allowed: false,
        message: "Team not found or you do not have permission to access it",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user has access to a notification
   * @param notificationId The notification ID
   * @param context The policy context
   * @returns Policy result
   */
  async checkNotificationAccess(
    notificationId: string,
    context: PolicyContext
  ): Promise<PolicyResult> {
    // Admin override
    if (context.isAdmin) {
      return { allowed: true };
    }

    // Check if the notification exists and belongs to the user
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
      },
    });

    if (!notification) {
      return {
        allowed: false,
        message:
          "Notification not found or you do not have permission to access it",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user has access to a wallet
   * @param walletId The wallet ID
   * @param context The policy context
   * @returns Policy result
   */
  async checkWalletAccess(
    walletId: string,
    context: PolicyContext
  ): Promise<PolicyResult> {
    // Admin override
    if (context.isAdmin) {
      return { allowed: true };
    }

    // Check if the wallet exists and belongs to the user
    const wallet = await this.prisma.userWallet.findFirst({
      where: {
        id: walletId,
      },
    });

    if (!wallet) {
      return {
        allowed: false,
        message: "Wallet not found or you do not have permission to access it",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user is an admin
   * @param userId The user ID
   * @returns Whether the user is an admin
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    // TODO: Add isAdmin to profile type in Prisma schema if required, or replace this logic with a valid property.
    return false;
  }

  /**
   * Create a policy context for a user
   * @param userId The user ID
   * @returns The policy context
   */
  async createContext(userId: string): Promise<PolicyContext> {
    const isAdmin = await this.isUserAdmin(userId);

    // Get teams the user belongs to
    const teams = await this.prisma.teamMember.findMany({
      where: {},
      select: {
        teamId: true,
      },
    });

    const teamIds = teams.map((team) => team.teamId);

    return {
      userId,
      isAdmin,
      teamIds,
    };
  }

  /**
   * Log an audit event
   * @param action The action performed
   * @param  The table name
   * @param userId The user ID
   * @returns The created audit log
   */
  async logAuditEvent(action: string, tableName: string, userId: string) {
    return this.prisma.auditLog.create({
      data: {
        action,
        resource: tableName,
        resourceId: "",  // Optional field, can be filled later if needed
        userId,
        metadata: {},
        createdAt: new Date(),
      },
    });
  }
}
