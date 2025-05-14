/**
 * Workflow Repository
 * 
 * This repository provides database operations for workflows.
 * It follows the repository pattern and provides type-safe operations.
 */

import { Prisma, WorkflowExecution } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { AccessDeniedError, BaseRepository } from './base.repository';
import prisma from '../client';
import { createAccessWhereClause, enforcePolicy, createPolicyContext } from '../policies/policy-utils';
import { PolicyContext } from '../policies/policy.service';

// Define the Workflow interface based on the Prisma schema
interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  nodes?: any;
  edges?: any;
  isPublic?: boolean;
  tags?: string[];
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Type definitions for workflow operations
export type WorkflowCreateInput = Prisma.WorkflowCreateInput;
export type WorkflowUpdateInput = Prisma.WorkflowUpdateInput;
export type WorkflowWithExecutions = Workflow & {
  executions: WorkflowExecution[];
};

export class WorkflowRepository extends BaseRepository<Workflow, WorkflowCreateInput, WorkflowUpdateInput> {
  protected tableName = 'workflows';
  protected model = this.prisma.workflow;

  /**
   * Find workflows by user ID with policy enforcement
   * @param userId The user ID to filter by
   * @param includeShared Whether to include workflows shared with the user
   * @returns An array of workflows
   */
  async findByUserId(userId: string, includeShared: boolean = true): Promise<Workflow[]> {
    const context = await createPolicyContext(userId);
    
    // Create where clause based on user access
    let whereClause: any = { userId };
    
    // Include shared workflows if requested
    if (includeShared) {
      whereClause = createAccessWhereClause(userId, context.isAdmin);
    }
    
    return this.prisma.workflow.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        team: includeShared,
      },
    });
  }

  /**
   * Find a workflow by ID with policy enforcement
   * @param id The workflow ID
   * @param userId The user ID for policy enforcement
   * @returns The workflow or null
   */
  async findById(id: string, userId?: string): Promise<Workflow | null> {
    // If no userId provided, use the base implementation
    if (!userId) {
      return super.findById(id);
    }
    
    // Create policy context
    const context = await createPolicyContext(userId);
    
    // If admin, return the workflow without restrictions
    if (context.isAdmin) {
      return this.prisma.workflow.findUnique({
        where: { id },
        include: {
          team: true,
        },
      });
    }
    
    // Otherwise, check if the user has access to the workflow
    return this.prisma.workflow.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true },
          {
            team: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      include: {
        team: true,
      },
    });
  }

  /**
   * Find a workflow with its executions
   * @param id The workflow ID
   * @returns The workflow with executions or null
   */
  async findWithExecutions(id: string): Promise<WorkflowWithExecutions | null> {
    return this.prisma.workflow.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  /**
   * Create a new workflow with policy enforcement
   * @param data The workflow data
   * @param userId The user ID for policy enforcement
   * @returns The created workflow
   */
  async create(data: WorkflowCreateInput, userId?: string): Promise<Workflow> {
    // If no userId provided, use the base implementation
    if (!userId) {
      return super.create(data);
    }
    
    // Ensure the workflow belongs to the user
    const workflowData: any = { ...data };
    workflowData.userId = userId;
    
    // Create the workflow with audit logging
    return this.executeWithTransaction(
      async (tx: PrismaClient) => {
        return tx.workflow.create({
          data: workflowData,
        });
      },
      'CREATE',
      'new', // Will be replaced with the actual ID
      userId,
      data
    );
  }

  /**
   * Create a workflow with nodes and edges
   * @param data The workflow data
   * @returns The created workflow
   */
  async createWithNodesAndEdges(
    data: WorkflowCreateInput & { 
      nodes?: any[]; 
      edges?: any[];
    }
  ): Promise<Workflow> {
    const { nodes, edges, ...workflowData } = data;
    
    // Convert nodes and edges to JSON if provided
    const workflow = await this.prisma.workflow.create({
      data: {
        ...workflowData,
        nodes: nodes ? JSON.stringify(nodes) : '[]',
        edges: edges ? JSON.stringify(edges) : '[]',
      },
    });

    return workflow;
  }

  /**
   * Update a workflow's definition
   * @param id The workflow ID
   * @param definition The new definition
   * @returns The updated workflow
   */
  async updateDefinition(id: string, definition: any): Promise<Workflow> {
    return this.prisma.workflow.update({
      where: { id },
      data: {
        definition,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find public workflows
   * @param limit The maximum number of workflows to return
   * @returns An array of public workflows
   */
  async findPublic(limit: number = 10): Promise<Workflow[]> {
    return this.prisma.workflow.findMany({
      where: { isPublic: true },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Find workflows by team ID with policy enforcement
   * @param teamId The team ID
   * @param userId The user ID for policy enforcement
   * @returns An array of workflows
   */
  async findByTeamId(teamId: string, userId: string): Promise<Workflow[]> {
    // Check if the user is a member of the team
    const context = await createPolicyContext(userId);
    
    if (!context.isAdmin) {
      const isMember = await this.prisma.teamMember.findFirst({
        where: {
          teamId,
          userId,
        },
      });
      
      if (!isMember) {
        throw new AccessDeniedError('You are not a member of this team');
      }
    }
    
    // Find workflows for the team
    return this.prisma.workflow.findMany({
      where: {
        team: {
          id: teamId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        team: true,
      },
    });
  }

  /**
   * Duplicate a workflow
   * @param id The workflow ID to duplicate
   * @param userId The user ID who will own the duplicate
   * @param newName The name for the duplicate
   * @returns The duplicated workflow
   */
  async duplicate(id: string, userId: string, newName?: string): Promise<Workflow> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    return this.prisma.workflow.create({
      data: {
        name: newName || `${workflow.name} (Copy)`,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        definition: workflow.definition,
        isPublic: false,
        userId,
        version: 1,
      },
    });
  }
}
