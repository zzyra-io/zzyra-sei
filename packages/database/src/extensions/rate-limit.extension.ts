import { Prisma, PrismaClient } from "@prisma/client";

// Rate limiting storage interface
export interface RateLimitStore {
  get(key: string): Promise<number | null>;
  increment(key: string, ttlSeconds: number): Promise<number>;
  reset(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Database-backed rate limit store using Prisma models
export class DatabaseRateLimitStore implements RateLimitStore {
  constructor(
    private prisma: PrismaClient,
    private defaultOperation: string = "default"
  ) {}

  private parseKey(key: string): { identifier: string; operation: string } {
    const parts = key.split(":");
    return {
      identifier: parts[0] || key,
      operation: parts[1] || this.defaultOperation,
    };
  }

  async get(key: string): Promise<number | null> {
    const { identifier, operation } = this.parseKey(key);
    const now = new Date();

    // Clean up expired buckets first
    await (this.prisma as any).rateLimitBucket.deleteMany({
      where: {
        resetAt: { lt: now },
      },
    });

    const bucket = await (this.prisma as any).rateLimitBucket.findFirst({
      where: {
        identifier,
        operation,
        resetAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    return bucket?.currentCount || null;
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const { identifier, operation } = this.parseKey(key);
    const now = new Date();
    const resetAt = new Date(now.getTime() + ttlSeconds * 1000);
    const windowStart = new Date(
      Math.floor(now.getTime() / (ttlSeconds * 1000)) * (ttlSeconds * 1000)
    );
    const windowEnd = new Date(windowStart.getTime() + ttlSeconds * 1000);

    // Use upsert to handle concurrent increments
    const bucket = await (this.prisma as any).rateLimitBucket.upsert({
      where: {
        identifier_operation_windowStart: {
          identifier,
          operation,
          windowStart,
        },
      },
      create: {
        identifier,
        operation,
        windowStart,
        windowEnd,
        currentCount: 1,
        limit: 100, // Default limit, should be configurable
        resetAt,
      },
      update: {
        currentCount: { increment: 1 },
        resetAt,
      },
    });

    return bucket.currentCount;
  }

  async reset(key: string): Promise<void> {
    const { identifier, operation } = this.parseKey(key);

    await (this.prisma as any).rateLimitBucket.deleteMany({
      where: {
        identifier,
        operation,
      },
    });
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.get(key);
    return count !== null && count > 0;
  }
}

// Redis-based rate limit store
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: any) {}

  async get(key: string): Promise<number | null> {
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : null;
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();
    return results[0][1]; // Return the incremented value
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }
}

// In-memory rate limit store for development
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiresAt: number }>();

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  async get(key: string): Promise<number | null> {
    this.cleanup();
    const item = this.store.get(key);
    return item ? item.count : null;
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    this.cleanup();
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    const existing = this.store.get(key);
    if (existing && now < existing.expiresAt) {
      existing.count++;
      return existing.count;
    } else {
      this.store.set(key, { count: 1, expiresAt });
      return 1;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    this.cleanup();
    return this.store.has(key);
  }
}

// Rate limit configuration
export interface RateLimitConfig {
  enabled: boolean;
  limits: {
    // Workflow execution limits
    workflowExecutions: {
      perMinute: number;
      perHour: number;
      perDay: number;
    };

    // Workflow creation limits
    workflowCreation: {
      perHour: number;
      perDay: number;
    };

    // API requests (general)
    apiRequests: {
      perMinute: number;
      perHour: number;
    };

    // Template creation
    templateCreation: {
      perHour: number;
      perDay: number;
    };

    // Notification sending
    notifications: {
      perMinute: number;
      perHour: number;
    };
  };

  // Role-based limits
  roleLimits: {
    admin: {
      multiplier: number;
    };
    user: {
      multiplier: number;
    };
    viewer: {
      multiplier: number;
    };
  };

  // Burst allowance
  burstAllowance: {
    enabled: boolean;
    multiplier: number; // How much to multiply limits for burst
    duration: number; // Seconds for burst allowance
  };
}

const defaultRateLimitConfig: RateLimitConfig = {
  enabled: true,
  limits: {
    workflowExecutions: {
      perMinute: 10,
      perHour: 100,
      perDay: 1000,
    },
    workflowCreation: {
      perHour: 5,
      perDay: 20,
    },
    apiRequests: {
      perMinute: 60,
      perHour: 1000,
    },
    templateCreation: {
      perHour: 3,
      perDay: 10,
    },
    notifications: {
      perMinute: 20,
      perHour: 200,
    },
  },
  roleLimits: {
    admin: { multiplier: 10 },
    user: { multiplier: 1 },
    viewer: { multiplier: 0.5 },
  },
  burstAllowance: {
    enabled: true,
    multiplier: 2,
    duration: 300, // 5 minutes
  },
};

// Rate limit error
export class RateLimitError extends Error {
  constructor(
    message: string,
    public rateLimitType: string,
    public limit: number,
    public current: number,
    public resetTime: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

// Generate rate limit keys
function generateRateLimitKey(
  userId: string,
  operation: string,
  timeWindow: string
): string {
  const now = Date.now();
  let windowStart: number;

  switch (timeWindow) {
    case "minute":
      windowStart = Math.floor(now / 60000) * 60000;
      break;
    case "hour":
      windowStart = Math.floor(now / 3600000) * 3600000;
      break;
    case "day":
      windowStart = Math.floor(now / 86400000) * 86400000;
      break;
    default:
      throw new Error(`Invalid time window: ${timeWindow}`);
  }

  return `zyra:ratelimit:${userId}:${operation}:${timeWindow}:${windowStart}`;
}

// Check if user is in burst allowance period
function isBurstAllowed(config: RateLimitConfig): boolean {
  return config.burstAllowance.enabled;
}

// Apply role-based multiplier to limits
function applyRoleMultiplier(
  limit: number,
  role: string,
  config: RateLimitConfig
): number {
  const multiplier =
    config.roleLimits[role as keyof typeof config.roleLimits]?.multiplier || 1;
  return Math.floor(limit * multiplier);
}

/**
 * Rate Limiting Extension
 *
 * Prevents abuse and ensures fair usage across users
 */
export const createRateLimitExtension = (
  store: RateLimitStore,
  userId: string,
  userRole: string = "user",
  config: Partial<RateLimitConfig> = {}
) => {
  const finalConfig = { ...defaultRateLimitConfig, ...config };

  const checkRateLimit = async (
    operation: string,
    limits: { perMinute?: number; perHour?: number; perDay?: number }
  ) => {
    if (!finalConfig.enabled) return;

    const checks = [];

    if (limits.perMinute) {
      checks.push({
        window: "minute",
        limit: applyRoleMultiplier(limits.perMinute, userRole, finalConfig),
        ttl: 60,
      });
    }

    if (limits.perHour) {
      checks.push({
        window: "hour",
        limit: applyRoleMultiplier(limits.perHour, userRole, finalConfig),
        ttl: 3600,
      });
    }

    if (limits.perDay) {
      checks.push({
        window: "day",
        limit: applyRoleMultiplier(limits.perDay, userRole, finalConfig),
        ttl: 86400,
      });
    }

    for (const check of checks) {
      const key = generateRateLimitKey(userId, operation, check.window);
      const current = await store.increment(key, check.ttl);

      let effectiveLimit = check.limit;

      // Apply burst allowance if enabled
      if (isBurstAllowed(finalConfig)) {
        effectiveLimit = Math.floor(
          check.limit * finalConfig.burstAllowance.multiplier
        );
      }

      if (current > effectiveLimit) {
        const resetTime = Date.now() + check.ttl * 1000;
        throw new RateLimitError(
          `Rate limit exceeded for ${operation}. Limit: ${effectiveLimit} per ${check.window}, current: ${current}`,
          operation,
          effectiveLimit,
          current,
          resetTime
        );
      }
    }
  };

  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      name: "RateLimit",
      query: {
        // Workflow execution rate limiting
        workflowExecution: {
          async create({ args, query }) {
            await checkRateLimit(
              "workflowExecution",
              finalConfig.limits.workflowExecutions
            );
            return query(args);
          },
        },

        // Workflow creation rate limiting
        workflow: {
          async create({ args, query }) {
            await checkRateLimit(
              "workflowCreation",
              finalConfig.limits.workflowCreation
            );
            return query(args);
          },
        },

        // Template creation rate limiting
        workflowTemplate: {
          async create({ args, query }) {
            await checkRateLimit(
              "templateCreation",
              finalConfig.limits.templateCreation
            );
            return query(args);
          },
        },

        // Notification rate limiting
        notification: {
          async create({ args, query }) {
            await checkRateLimit(
              "notifications",
              finalConfig.limits.notifications
            );
            return query(args);
          },
        },

        // General API rate limiting for read operations
        $allModels: {
          async findMany({ model, args, query }) {
            // Only apply to frequent read operations
            if (["workflow", "template", "workflowExecution"].includes(model)) {
              await checkRateLimit(
                "apiRequests",
                finalConfig.limits.apiRequests
              );
            }
            return query(args);
          },
        },
      },
    })
  );
};

/**
 * Rate limit utilities
 */
export const createRateLimitUtils = (store: RateLimitStore) => {
  return {
    async getRateLimitStatus(userId: string, operation: string) {
      const windows = ["minute", "hour", "day"];
      const status: Record<string, { current: number; limit: number }> = {};

      for (const window of windows) {
        const key = generateRateLimitKey(userId, operation, window);
        const current = (await store.get(key)) || 0;

        // Get limit based on operation
        let limit = 0;
        switch (operation) {
          case "workflowExecution":
            limit =
              defaultRateLimitConfig.limits.workflowExecutions[
                `per${window.charAt(0).toUpperCase() + window.slice(1)}` as keyof typeof defaultRateLimitConfig.limits.workflowExecutions
              ] || 0;
            break;
          case "workflowCreation":
            limit =
              window === "minute"
                ? 0
                : defaultRateLimitConfig.limits.workflowCreation[
                    `per${window.charAt(0).toUpperCase() + window.slice(1)}` as keyof typeof defaultRateLimitConfig.limits.workflowCreation
                  ] || 0;
            break;
          // Add more operations as needed
        }

        status[window] = { current, limit };
      }

      return status;
    },

    async resetUserRateLimit(userId: string, operation?: string) {
      const operations = operation
        ? [operation]
        : [
            "workflowExecution",
            "workflowCreation",
            "apiRequests",
            "templateCreation",
            "notifications",
          ];

      const windows = ["minute", "hour", "day"];

      for (const op of operations) {
        for (const window of windows) {
          const key = generateRateLimitKey(userId, op, window);
          await store.reset(key);
        }
      }

      console.log(
        `Rate limits reset for user ${userId}${operation ? ` (${operation})` : ""}`
      );
    },

    async isRateLimited(userId: string, operation: string): Promise<boolean> {
      const windows = ["minute", "hour", "day"];

      for (const window of windows) {
        const key = generateRateLimitKey(userId, operation, window);
        const current = (await store.get(key)) || 0;

        // Check against limits (simplified check)
        let limit = 0;
        switch (operation) {
          case "workflowExecution":
            if (window === "minute")
              limit =
                defaultRateLimitConfig.limits.workflowExecutions.perMinute;
            if (window === "hour")
              limit = defaultRateLimitConfig.limits.workflowExecutions.perHour;
            if (window === "day")
              limit = defaultRateLimitConfig.limits.workflowExecutions.perDay;
            break;
        }

        if (current >= limit) {
          return true;
        }
      }

      return false;
    },

    async getRemainingRequests(
      userId: string,
      operation: string,
      window: string
    ): Promise<number> {
      const key = generateRateLimitKey(userId, operation, window);
      const current = (await store.get(key)) || 0;

      // Get limit (simplified)
      let limit = 0;
      if (operation === "workflowExecution") {
        switch (window) {
          case "minute":
            limit = defaultRateLimitConfig.limits.workflowExecutions.perMinute;
            break;
          case "hour":
            limit = defaultRateLimitConfig.limits.workflowExecutions.perHour;
            break;
          case "day":
            limit = defaultRateLimitConfig.limits.workflowExecutions.perDay;
            break;
        }
      }

      return Math.max(0, limit - current);
    },
  };
};
