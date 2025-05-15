/**
 * Workflow Repository
 *
 * This repository provides database operations for workflows.
 * It follows the repository pattern and provides type-safe operations.
 */

import { Prisma, WorkflowExecution } from "@prisma/client";
import type { Prisma as PrismaNamespace } from "@prisma/client";
import { AccessDeniedError, BaseRepository } from "./base.repository";
import prisma from "../client";
import {
  createAccessWhereClause,
  enforcePolicy,
  createPolicyContext,
} from "../policies/policy-utils";
import { PolicyContext } from "../policies/policy.service";

// Define the Workflow interface based on the Prisma schema
interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  nodes?: any;
  edges?: any;
  isPublic?: boolean | null; // Updated to match Prisma's schema where isPublic is nullable
  tags?: string[];
  version?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  definition?: any;
  createdBy?: string | null;
}

// Type definitions for workflow operations
export type WorkflowCreateInput = Prisma.WorkflowCreateInput;
export type WorkflowUpdateInput = Prisma.WorkflowUpdateInput;
export type WorkflowWithExecutions = Workflow & {
  executions: WorkflowExecution[];
};

export class WorkflowRepository extends BaseRepository<
  Workflow,
  WorkflowCreateInput,
  WorkflowUpdateInput
> {
  protected tableName = "workflows";
  protected model = this.prisma.workflow;
  
  /**
   * Map a Prisma workflow to our Workflow interface
   * This ensures type safety when converting between Prisma types and our interface
   */
  private mapToWorkflow(workflow: any): Workflow {
    return {
      id: workflow.id,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes ?? Prisma.JsonNull,
      edges: workflow.edges ?? Prisma.JsonNull,
      isPublic: workflow.isPublic,
      tags: workflow.tags,
      version: workflow.version,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      definition: workflow.definition ?? Prisma.JsonNull,
      createdBy: workflow.createdBy,
    };
  }

  /**
   * Find workflows by user ID with policy enforcement
   * @param userId The user ID to filter by
   * @param includeShared Whether to include workflows shared with the user
   * @returns An array of workflows
   */
  async findByUserId(
    userId: string,
    includeShared: boolean = true
  ): Promise<Workflow[]> {
    const context = await createPolicyContext(userId);

    // Create where clause based on user access
    let whereClause: any = { userId };

    // Include shared workflows if requested
    if (includeShared) {
      whereClause = createAccessWhereClause(userId, context.isAdmin);
    }

    const workflows = await this.prisma.workflow.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      // No additional includes needed
      // Previously included team, but that relation no longer exists
    });

    return workflows.map(workflow => this.mapToWorkflow(workflow));
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
      const workflow = await this.prisma.workflow.findUnique({
        where: { id },
        // No additional includes needed
        // Previously included team, but that relation no longer exists
      });
      
      return workflow ? this.mapToWorkflow(workflow) : null;
    }

    // Otherwise, check if the user has access to the workflow
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true },
          // Team-related access has been removed as team relation no longer exists
        ],
      },
      // No additional includes needed
      // Previously included team, but that relation no longer exists
    });
    
    return workflow ? this.mapToWorkflow(workflow) : null;
  }

  /**
   * Find a workflow with its executions
   * @param id The workflow ID
   * @returns The workflow with executions or null
   */
  async findWithExecutions(id: string): Promise<WorkflowWithExecutions | null> {
    const result = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    
    if (!result) return null;
    
    // Map to our interface with executions included
    const workflow = this.mapToWorkflow(result);
    return {
      ...workflow,
      executions: result.executions,
    };
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
      async (tx: PrismaNamespace.TransactionClient) => {
        const result = await tx.workflow.create({
          data: workflowData,
        });
        return this.mapToWorkflow(result);
      },
      "CREATE",
      "new", // Will be replaced with the actual ID
      userId
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
    const result = await this.prisma.workflow.create({
      data: {
        ...workflowData,
        nodes: nodes ? JSON.stringify(nodes) : "[]",
        edges: edges ? JSON.stringify(edges) : "[]",
      },
    });

    return this.mapToWorkflow(result);
  }

  /**
   * Update a workflow's definition
   * @param id The workflow ID
   * @param definition The new definition
   * @returns The updated workflow
   */
  async updateDefinition(id: string, definition: any): Promise<Workflow> {
    const result = await this.prisma.workflow.update({
      where: { id },
      data: {
        definition,
        updatedAt: new Date(),
      },
    });
    
    return this.mapToWorkflow(result);
  }

  /**
   * Find public workflows
   * @param limit The maximum number of workflows to return
   * @returns An array of public workflows
   */
  async findPublic(limit: number = 10): Promise<Workflow[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: { isPublic: true },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
    
    return workflows.map(workflow => this.mapToWorkflow(workflow));
  }

  /**
   * Find workflows by organization (replaces team-based filtering)
   * @param organizationId The organization ID
   * @param userId The user ID for policy enforcement
   * @returns An array of workflows
   */
  async findByOrganization(organizationId: string, userId: string): Promise<Workflow[]> {
    // Check policy context for authorization
    const context = await createPolicyContext(userId);
    
    // This would normally check organization membership, but for now
    // we'll just check if the user has access based on the context
    if (!context.isAdmin) {
      // In a real implementation, there would be a check for organization membership
      // For now, we'll just enforce that the user ID matches
      if (!userId) {
        throw new AccessDeniedError("Access denied");
      }
    }

    // Find workflows for the user in this organization
    // Note: organization filtering would be implemented differently
    // once that relationship is established in the schema
    const workflows = await this.prisma.workflow.findMany({
      where: {
        userId,
        // In the future: organizationId field would be used here
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return workflows.map(workflow => this.mapToWorkflow(workflow));
  }

  /**
   * Duplicate a workflow
   * @param id The workflow ID to duplicate
   * @param userId The user ID who will own the duplicate
   * @param newName The name for the duplicate
   * @returns The duplicated workflow
   */
  async duplicate(
    id: string,
    userId: string,
    newName?: string
  ): Promise<Workflow> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    const result = await this.prisma.workflow.create({
      data: {
        name: newName || `${workflow.name} (Copy)`,
        description: workflow.description,
        nodes: workflow.nodes ?? Prisma.JsonNull,
        edges: workflow.edges ?? Prisma.JsonNull,
        definition: workflow.definition ?? Prisma.JsonNull,
        isPublic: false,
        userId,
        version: 1,
      },
    });
    
    return this.mapToWorkflow(result);
  }
}
