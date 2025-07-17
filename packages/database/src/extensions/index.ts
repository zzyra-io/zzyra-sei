// Import functions for use within this file
import { createRLSExtension, createRLSUtils } from "./rls.extension";

import {
  createCacheExtension,
  MemoryCache,
  RedisCache,
  createCacheUtils,
} from "./cache.extension";

import {
  createRateLimitExtension,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  createRateLimitUtils,
} from "./rate-limit.extension";

import {
  createWorkflowStateExtension,
  createWorkflowStateUtils,
} from "./workflow-state.extension";

import { createAuditExtension, createAuditUtils } from "./audit.extension";
import defaultPrisma from "../client";

// Extension exports
export {
  createRLSExtension,
  createOrganizationRLSExtension,
  createAdminBypassExtension,
  createReadOnlyExtension,
  createRLSUtils,
  createRLSExtensionManager,
  type RLSContext,
} from "./rls.extension";

export {
  createCacheExtension,
  MemoryCache,
  RedisCache,
  DatabaseCacheProvider,
  createCacheUtils,
  type CacheProvider,
  type CacheConfig,
} from "./cache.extension";

export {
  createRateLimitExtension,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  DatabaseRateLimitStore,
  createRateLimitUtils,
  RateLimitError,
  type RateLimitStore,
  type RateLimitConfig,
} from "./rate-limit.extension";

export {
  createWorkflowStateExtension,
  createWorkflowStateUtils,
  type WorkflowStateConfig,
  type StateEventHandler,
} from "./workflow-state.extension";

export {
  createAuditExtension,
  createAuditUtils,
  type AuditConfig,
  type AuditContext,
} from "./audit.extension";

// Core types
export interface ExtensionConfig {
  development: boolean;
  cache: {
    enabled: boolean;
    provider: any;
    config: any;
  };
  rateLimit: {
    enabled: boolean;
    store: any;
    config: any;
  };
  audit: {
    enabled: boolean;
    config: any;
    context: any;
  };
  workflowState: {
    enabled: boolean;
    config: any;
    eventHandler?: any;
  };
  rls: {
    enabled: boolean;
    context: any;
  };
}

// Extension manager
export class ExtensionManager {
  private extensions: any[] = [];
  private cacheUtils: any;
  private rlsUtils: any;
  private auditUtils: any;
  private rateLimitUtils: any;
  private workflowStateUtils: any;

  constructor(private config: ExtensionConfig) {
    this.setupExtensions();
    this.setupUtils();
  }

  private setupExtensions() {
    // Cache extension
    if (this.config.cache?.enabled) {
      const cacheExtension = createCacheExtension(
        this.config.cache.provider,
        this.config.cache.config
      );
      if (cacheExtension) {
        this.extensions.push(cacheExtension);
      }
    }

    // Rate limiting extension
    if (this.config.rateLimit?.enabled) {
      const rateLimitExtension = createRateLimitExtension(
        this.config.rateLimit.store,
        this.config.rateLimit.config
      );
      if (rateLimitExtension) {
        this.extensions.push(rateLimitExtension);
      }
    }

    // Audit extension
    if (this.config.audit?.enabled) {
      const auditExtension = createAuditExtension(
        defaultPrisma, // pass the Prisma client
        this.config.audit.config,
        this.config.audit.context
      );
      if (auditExtension) {
        this.extensions.push(auditExtension);
      }
    }

    // Workflow state extension
    if (this.config.workflowState?.enabled) {
      const workflowStateExtension = createWorkflowStateExtension(
        this.config.workflowState.config,
        this.config.workflowState.eventHandler
      );
      if (workflowStateExtension) {
        this.extensions.push(workflowStateExtension);
      }
    }

    // RLS extension
    if (this.config.rls?.enabled) {
      const rlsExtension = createRLSExtension(this.config.rls.context);
      if (rlsExtension) {
        this.extensions.push(rlsExtension);
      }
    }
  }

  private setupUtils() {
    this.cacheUtils = createCacheUtils();
    this.rlsUtils = createRLSUtils();
    this.auditUtils = createAuditUtils();

    // Rate limit utils need a store, use the one from config if available
    if (this.config.rateLimit?.store) {
      this.rateLimitUtils = createRateLimitUtils(this.config.rateLimit.store);
    } else {
      // Provide a default memory store for utils
      this.rateLimitUtils = createRateLimitUtils(new MemoryRateLimitStore());
    }

    this.workflowStateUtils = createWorkflowStateUtils();
  }

  getExtensions() {
    return this.extensions;
  }

  async getHealth() {
    return {
      extensions: this.extensions.length,
      cache: this.config.cache?.enabled || false,
      rateLimit: this.config.rateLimit?.enabled || false,
      audit: this.config.audit?.enabled || false,
      workflowState: this.config.workflowState?.enabled || false,
      rls: this.config.rls?.enabled || false,
    };
  }

  getUtils() {
    return {
      cache: this.cacheUtils,
      rls: this.rlsUtils,
      audit: this.auditUtils,
      rateLimit: this.rateLimitUtils,
      workflowState: this.workflowStateUtils,
    };
  }
}

// Factory functions
export function createDevelopmentExtensionManager(): ExtensionManager {
  const memoryCache = new MemoryCache(500);
  const memoryRateLimit = new MemoryRateLimitStore();

  return new ExtensionManager({
    development: true,
    cache: {
      enabled: true,
      provider: memoryCache,
      config: {
        enabled: true,
        defaultTTL: 60, // 1 minute for development
        maxSize: 500,
      },
    },
    rateLimit: {
      enabled: true,
      store: memoryRateLimit,
      config: {
        enabled: true,
        defaultWindow: 60,
        defaultLimit: 100,
      },
    },
    audit: {
      enabled: true,
      config: {
        enabled: true,
        logWrites: true,
        logReads: false,
        complianceLevel: "basic",
      },
      context: {
        userId: "dev-user",
      },
    },
    workflowState: {
      enabled: true,
      config: {
        enabled: true,
        updateStatistics: true,
        trackTransitions: true,
      },
    },
    rls: {
      enabled: false, // Usually disabled in development
      context: {
        role: "admin",
      },
    },
  });
}

export function createProductionExtensionManager(options: {
  userId?: string;
  role?: "user" | "admin" | "readonly";
  cacheProvider?: any;
  rateLimitStore?: any;
}): ExtensionManager {
  const cacheProvider = options.cacheProvider || new MemoryCache(1000);
  const rateLimitStore = options.rateLimitStore || new MemoryRateLimitStore();

  return new ExtensionManager({
    development: false,
    cache: {
      enabled: true,
      provider: cacheProvider,
      config: {
        enabled: true,
        defaultTTL: 300, // 5 minutes
        maxSize: 1000,
      },
    },
    rateLimit: {
      enabled: true,
      store: rateLimitStore,
      config: {
        enabled: true,
        defaultWindow: 60,
        defaultLimit: 60,
        limits: {
          workflowCreation: { window: 3600, limit: 10 },
          workflowExecution: { window: 60, limit: 30 },
          templateCreation: { window: 3600, limit: 5 },
        },
      },
    },
    audit: {
      enabled: true,
      config: {
        enabled: true,
        logWrites: true,
        logReads: false,
        complianceLevel: "basic",
        retentionDays: 90,
      },
      context: {
        userId: options.userId,
      },
    },
    workflowState: {
      enabled: true,
      config: {
        enabled: true,
        updateStatistics: true,
        trackTransitions: true,
        createSnapshots: false,
      },
    },
    rls: {
      enabled: true,
      context: {
        userId: options.userId,
        role: options.role || "user",
      },
    },
  });
}

// Extended Prisma client type
export type ExtendedPrismaClient = any; // Simplified for now

export function createExtendedPrismaClient(
  prisma: any,
  extensionManager?: ExtensionManager
): ExtendedPrismaClient {
  if (!extensionManager) {
    return prisma;
  }

  const extensions = extensionManager.getExtensions();
  let extendedClient = prisma;

  for (const extension of extensions) {
    extendedClient = extendedClient.$extends(extension);
  }

  return extendedClient;
}
