/**
 * @zyra/database
 *
 * This package provides a centralized database access layer for the Zzyra platform.
 * It exports the Prisma client, repositories, authentication services, and utility functions.
 */

// Export Prisma client and utilities
export {
  default as prisma,
  DatabaseError,
  checkDatabaseHealth,
  getDatabaseConnectionState,
  connectDatabase,
  disconnectDatabase,
} from "./client";
export * from "./client";

// Export all types
export * from "./types";

// Export repositories
export * from "./repositories/base.repository";
export * from "./repositories/user.repository";
export * from "./repositories/workflow.repository";
export * from "./repositories/execution.repository";
export * from "./repositories/wallet.repository";
export * from "./repositories/notification.repository";

// Export authentication
export * from "./auth/types";
export * from "./auth/jwt.service";
export * from "./auth/auth.service";
export * from "./auth/middleware";

// Export utilities
export * from "./utils/validation";
export * from "./utils/pagination";

// Export extensions and utilities
export {
  ExtensionManager,
  createDevelopmentExtensionManager,
  createProductionExtensionManager,
  createExtendedPrismaClient,
  type ExtendedPrismaClient,
  type ExtensionConfig,
  type RLSContext,
  type CacheProvider,
  type CacheConfig,
  type RateLimitStore,
  type RateLimitConfig,
  type WorkflowStateConfig,
  type StateEventHandler,
  type AuditConfig,
  type AuditContext,
  MemoryCache,
  RedisCache,
  DatabaseCacheProvider,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  DatabaseRateLimitStore,
  RateLimitError,
  createRLSExtension,
  createCacheExtension,
  createRateLimitExtension,
  createWorkflowStateExtension,
  createAuditExtension,
  createCacheUtils,
  createRateLimitUtils,
  createWorkflowStateUtils,
  createAuditUtils,
} from "./extensions";
