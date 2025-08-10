/**
 * Base Repository
 *
 * This is the base repository class that all repositories should extend.
 * It provides common CRUD operations for all repositories with policy enforcement.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../client";
import {
  PolicyContext,
  PolicyResult,
  PolicyService,
} from "../policies/policy.service";

/**
 * Access denied error class
 */
export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/**
 * Base repository options
 */
export interface BaseRepositoryOptions {
  auditEnabled?: boolean;
  policyEnabled?: boolean;
}

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected prisma: PrismaClient;
  protected policyService: PolicyService;
  protected abstract model: any;
  protected abstract tableName: string;
  protected options: BaseRepositoryOptions;

  constructor(prismaClient?: PrismaClient, options: BaseRepositoryOptions = {}) {
    // Use the provided client or fall back to the default
    this.prisma = prismaClient || prisma;
    this.policyService = new PolicyService();
    this.options = {
      auditEnabled: true,
      policyEnabled: true,
      ...options,
    };
  }

  /**
   * Create a policy context for a user
   * @param userId The user ID
   * @returns The policy context
   */
  protected async createPolicyContext(userId: string): Promise<PolicyContext> {
    return this.policyService.createContext(userId);
  }

  /**
   * Check if a policy result allows access
   * @param result The policy result
   * @throws AccessDeniedError if access is denied
   */
  protected checkPolicyResult(result: PolicyResult): void {
    if (!result.allowed) {
      throw new AccessDeniedError(result.message || "Access denied");
    }
  }

  /**
   * Log an audit event
   * @param action The action performed
   * @param rowId The row ID (used for context but not sent to audit log)
   * @param userId The user ID
   */
  protected async logAudit(
    action: string,
    rowId: string,
    userId: string
  ): Promise<void> {
    if (this.options.auditEnabled) {
      await this.policyService.logAuditEvent(action, this.tableName, userId);
    }
  }

  /**
   * Find an entity by ID with policy enforcement
   * @param id The entity ID
   * @param userId The user ID (for policy enforcement)
   * @returns The entity or null
   */
  async findById(id: string, userId?: string): Promise<T | null> {
    // If no userId provided or policy is disabled, skip policy enforcement
    if (!userId || !this.options.policyEnabled) {
      return this.model.findUnique({
        where: { id },
      });
    }

    // Create policy context
    const context = await this.createPolicyContext(userId);

    // Get entity with basic check
    const entity = await this.model.findUnique({
      where: { id },
    });

    // If entity doesn't exist, return null
    if (!entity) return null;

    // Check if user has access to this entity
    // This is a basic check that will be overridden by specific repositories
    if (entity.userId && entity.userId !== userId && !context.isAdmin) {
      return null;
    }

    return entity;
  }

  /**
   * Find all entities with policy enforcement
   * @param userId The user ID (for policy enforcement)
   * @returns An array of entities
   */
  async findAll(userId?: string): Promise<T[]> {
    // If no userId provided or policy is disabled, skip policy enforcement
    if (!userId || !this.options.policyEnabled) {
      return this.model.findMany();
    }

    // Create policy context
    const context = await this.createPolicyContext(userId);

    // If admin, return all entities
    if (context.isAdmin) {
      return this.model.findMany();
    }

    // Otherwise, return only entities the user has access to
    return this.model.findMany({
      where: {
        OR: [
          { userId: context.userId },
          { isPublic: true },
          {
            team: {
              members: {
                some: {
                  userId: context.userId,
                },
              },
            },
          },
        ],
      },
    });
  }

  /**
   * Create a new entity with policy enforcement
   * @param data The entity data
   * @param userId The user ID (for policy enforcement)
   * @returns The created entity
   */
  async create(data: CreateInput, userId?: string): Promise<T> {
    // If userId is provided and the entity supports it, set the userId
    const entityData: any = { ...data };
    if (userId) {
      entityData.userId = userId;
    }

    // Create the entity
    const entity = await this.model.create({
      data: entityData,
    });

    // Log audit event if enabled and userId is provided
    if (userId && this.options.auditEnabled) {
      await this.logAudit("CREATE", entity.id, userId);
    }

    return entity;
  }

  /**
   * Update an entity with policy enforcement
   * @param id The entity ID
   * @param data The entity data
   * @param userId The user ID (for policy enforcement)
   * @returns The updated entity
   */
  async update(id: string, data: UpdateInput, userId?: string): Promise<T> {
    // If no userId provided or policy is disabled, skip policy enforcement
    if (!userId || !this.options.policyEnabled) {
      return this.model.update({
        where: { id },
        data,
      });
    }

    // Check if user has access to this entity
    const entity = await this.findById(id, userId);
    if (!entity) {
      throw new AccessDeniedError(
        "Entity not found or you do not have permission to update it"
      );
    }

    // Update the entity
    const updatedEntity = await this.model.update({
      where: { id },
      data,
    });

    // Log audit event
    await this.logAudit("UPDATE", id, userId);

    return updatedEntity;
  }

  /**
   * Delete an entity with policy enforcement
   * @param id The entity ID
   * @param userId The user ID (for policy enforcement)
   * @returns The deleted entity
   */
  async delete(id: string, userId?: string): Promise<T> {
    // If no userId provided or policy is disabled, skip policy enforcement
    if (!userId || !this.options.policyEnabled) {
      return this.model.delete({
        where: { id },
      });
    }

    // Check if user has access to this entity
    const entity = await this.findById(id, userId);
    if (!entity) {
      throw new AccessDeniedError(
        "Entity not found or you do not have permission to delete it"
      );
    }

    // Delete the entity
    const deletedEntity = await this.model.delete({
      where: { id },
    });

    // Log audit event
    await this.logAudit("DELETE", id, userId);

    return deletedEntity;
  }

  /**
   * Perform an operation in a transaction with audit logging
   * @param operation The operation to perform
   * @param action The audit action
   * @param rowId The row ID
   * @param userId The user ID
   * @returns The result of the operation
   */
  protected async executeWithTransaction<R>(
    operation: (tx: Prisma.TransactionClient) => Promise<R>,
    action: string,
    rowId: string,
    userId: string
  ): Promise<R> {
    return await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Perform the operation
        const result = await operation(tx);

        // Log audit event if enabled
        if (this.options.auditEnabled) {
          await tx.auditLog.create({
            data: {
              action,
              resource: this.tableName,
              resourceId: rowId,
              userId,
              metadata: {},
              createdAt: new Date(),
            },
          });
        }

        return result;
      }
    );
  }

  /**
   * Find many records based on a filter
   * @param filter The filter to apply
   * @param options Additional options for the query
   * @returns An array of records
   */
  async findMany(filter?: any, options?: any): Promise<T[]> {
    return this.model.findMany({
      where: filter,
      ...options,
    });
  }

  /**
   * Count records based on a filter
   * @param filter The filter to apply
   * @returns The count of records
   */
  async count(filter?: any): Promise<number> {
    return this.model.count({
      where: filter,
    });
  }
}
