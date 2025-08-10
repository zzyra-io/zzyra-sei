import { Prisma } from "@prisma/client";

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // seconds
  maxSize: number; // max number of cached items
  namespace?: string;
  compression: boolean;
  compressionThreshold: number; // bytes
}

export interface CacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
}

const defaultCacheConfig: CacheConfig = {
  enabled: true,
  defaultTTL: 300, // 5 minutes
  maxSize: 1000,
  compression: false,
  compressionThreshold: 1024, // 1KB
};

/**
 * In-Memory Cache Provider
 */
export class MemoryCache implements CacheProvider {
  private cache = new Map<string, { value: string; expires: number }>();
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttl: number = 300): Promise<void> {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());

    if (!pattern) {
      return allKeys;
    }

    // Simple pattern matching (basic wildcard support)
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return allKeys.filter((key) => regex.test(key));
  }
}

/**
 * Redis Cache Provider (placeholder implementation)
 */
export class RedisCache implements CacheProvider {
  constructor(private redisClient?: any) {
    // In a real implementation, this would accept a Redis client
  }

  async get(key: string): Promise<string | null> {
    // Placeholder - would use Redis client
    console.log(`Redis GET: ${key}`);
    return null;
  }

  async set(key: string, value: string, ttl: number = 300): Promise<void> {
    // Placeholder - would use Redis client
    console.log(`Redis SET: ${key} with TTL ${ttl}`);
  }

  async delete(key: string): Promise<void> {
    // Placeholder - would use Redis client
    console.log(`Redis DELETE: ${key}`);
  }

  async clear(): Promise<void> {
    // Placeholder - would use Redis client
    console.log("Redis FLUSHALL");
  }

  async keys(pattern?: string): Promise<string[]> {
    // Placeholder - would use Redis client
    console.log(`Redis KEYS: ${pattern || "*"}`);
    return [];
  }
}

/**
 * Database Cache Provider (simplified)
 */
export class DatabaseCacheProvider implements CacheProvider {
  constructor(private prisma: any) {}

  async get(key: string): Promise<string | null> {
    try {
      // Note: CacheEntry model doesn't exist in current schema
      // This is a placeholder for future implementation
      console.log(`Database cache GET: ${key}`);
      return null;
    } catch (error) {
      console.warn("Database cache get failed:", error);
      return null;
    }
  }

  async set(key: string, value: string, ttl: number = 300): Promise<void> {
    try {
      // Note: CacheEntry model doesn't exist in current schema
      // This is a placeholder for future implementation
      console.log(`Database cache SET: ${key} with TTL ${ttl}`);
    } catch (error) {
      console.warn("Database cache set failed:", error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      console.log(`Database cache DELETE: ${key}`);
    } catch (error) {
      console.warn("Database cache delete failed:", error);
    }
  }

  async clear(): Promise<void> {
    try {
      console.log("Database cache CLEAR");
    } catch (error) {
      console.warn("Database cache clear failed:", error);
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      console.log(`Database cache KEYS: ${pattern || "*"}`);
      return [];
    } catch (error) {
      console.warn("Database cache keys failed:", error);
      return [];
    }
  }
}

/**
 * Cache Extension for Prisma
 */
export function createCacheExtension(
  provider: CacheProvider,
  config: Partial<CacheConfig> = {}
) {
  const finalConfig = { ...defaultCacheConfig, ...config };

  if (!finalConfig.enabled) {
    return null;
  }

  return Prisma.defineExtension({
    name: "Cache",
    query: {
      // Cache read operations
      $allModels: {
        async findMany({ model, args, query }) {
          const cacheKey = `${model}:findMany:${JSON.stringify(args)}`;

          // Try to get from cache
          const cached = await provider.get(cacheKey);
          if (cached) {
            console.log(`Cache HIT: ${cacheKey}`);
            return JSON.parse(cached);
          }

          // Execute query and cache result
          const result = await query(args);

          // Cache the result
          try {
            await provider.set(
              cacheKey,
              JSON.stringify(result),
              finalConfig.defaultTTL
            );
            console.log(`Cache SET: ${cacheKey}`);
          } catch (error) {
            console.warn("Failed to cache result:", error);
          }

          return result;
        },

        async findFirst({ model, args, query }) {
          const cacheKey = `${model}:findFirst:${JSON.stringify(args)}`;

          // Try to get from cache
          const cached = await provider.get(cacheKey);
          if (cached) {
            console.log(`Cache HIT: ${cacheKey}`);
            return JSON.parse(cached);
          }

          // Execute query and cache result
          const result = await query(args);

          // Cache the result
          try {
            await provider.set(
              cacheKey,
              JSON.stringify(result),
              finalConfig.defaultTTL
            );
            console.log(`Cache SET: ${cacheKey}`);
          } catch (error) {
            console.warn("Failed to cache result:", error);
          }

          return result;
        },

        async findUnique({ model, args, query }) {
          const cacheKey = `${model}:findUnique:${JSON.stringify(args)}`;

          // Try to get from cache
          const cached = await provider.get(cacheKey);
          if (cached) {
            console.log(`Cache HIT: ${cacheKey}`);
            return JSON.parse(cached);
          }

          // Execute query and cache result
          const result = await query(args);

          // Cache the result
          try {
            await provider.set(
              cacheKey,
              JSON.stringify(result),
              finalConfig.defaultTTL
            );
            console.log(`Cache SET: ${cacheKey}`);
          } catch (error) {
            console.warn("Failed to cache result:", error);
          }

          return result;
        },

        // Invalidate cache on write operations
        async create({ model, args, query }) {
          const result = await query(args);

          // Invalidate related cache entries
          try {
            const keys = await provider.keys(`${model}:*`);
            for (const key of keys) {
              await provider.delete(key);
            }
            console.log(`Cache invalidated for model: ${model}`);
          } catch (error) {
            console.warn(
              `Failed to invalidate cache for model ${model}:`,
              error
            );
          }

          return result;
        },

        async update({ model, args, query }) {
          const result = await query(args);

          // Invalidate related cache entries
          try {
            const keys = await provider.keys(`${model}:*`);
            for (const key of keys) {
              await provider.delete(key);
            }
            console.log(`Cache invalidated for model: ${model}`);
          } catch (error) {
            console.warn(
              `Failed to invalidate cache for model ${model}:`,
              error
            );
          }

          return result;
        },

        async delete({ model, args, query }) {
          const result = await query(args);

          // Invalidate related cache entries
          try {
            const keys = await provider.keys(`${model}:*`);
            for (const key of keys) {
              await provider.delete(key);
            }
            console.log(`Cache invalidated for model: ${model}`);
          } catch (error) {
            console.warn(
              `Failed to invalidate cache for model ${model}:`,
              error
            );
          }

          return result;
        },
      },
    },
    client: {
      async invalidateModelCache(model: string) {
        try {
          const keys = await provider.keys(`${model}:*`);
          for (const key of keys) {
            await provider.delete(key);
          }
          console.log(`Cache invalidated for model: ${model}`);
        } catch (error) {
          console.warn(`Failed to invalidate cache for model ${model}:`, error);
        }
      },

      async clearCache() {
        try {
          await provider.clear();
          console.log("Cache cleared");
        } catch (error) {
          console.warn("Failed to clear cache:", error);
        }
      },

      async getCacheStats() {
        try {
          const keys = await provider.keys();
          return {
            totalKeys: keys.length,
            keysByModel: keys.reduce((acc: Record<string, number>, key) => {
              const model = key.split(":")[0];
              acc[model] = (acc[model] || 0) + 1;
              return acc;
            }, {}),
          };
        } catch (error) {
          console.warn("Failed to get cache stats:", error);
          return { totalKeys: 0, keysByModel: {} };
        }
      },
    },
  });
}

/**
 * Cache utilities
 */
export const createCacheUtils = () => {
  return {
    // Create cache key
    createKey: (model: string, operation: string, args: any) => {
      return `${model}:${operation}:${JSON.stringify(args)}`;
    },

    // Compress data if needed
    compress: (data: string, threshold: number = 1024) => {
      if (data.length > threshold) {
        // In a real implementation, you'd use a compression library
        return `[COMPRESSED:${data.length}]`;
      }
      return data;
    },

    // Create cache warming strategy
    createWarmingStrategy: (provider: CacheProvider) => ({
      async warmModel(prisma: any, model: string, commonQueries: any[]) {
        console.log(`Warming cache for model: ${model}`);

        for (const query of commonQueries) {
          try {
            const key = `${model}:${query.operation}:${JSON.stringify(query.args)}`;

            // Check if already cached
            const existing = await provider.get(key);
            if (existing) continue;

            // Execute query and cache result
            const result = await (prisma as any)[model][query.operation](
              query.args
            );
            await provider.set(key, JSON.stringify(result));

            console.log(`Warmed cache for: ${key}`);
          } catch (error) {
            console.warn(`Failed to warm cache for ${model}:`, error);
          }
        }
      },
    }),

    // Cache invalidation patterns
    createInvalidationStrategy: (provider: CacheProvider) => ({
      async invalidateByPattern(pattern: string) {
        const keys = await provider.keys(pattern);
        for (const key of keys) {
          await provider.delete(key);
        }
        console.log(
          `Invalidated ${keys.length} cache entries matching: ${pattern}`
        );
      },

      async invalidateRelated(model: string, id: string) {
        // Invalidate direct entries
        await provider.delete(`${model}:findUnique:*${id}*`);

        // Invalidate list queries for the model
        const listKeys = await provider.keys(`${model}:findMany:*`);
        for (const key of listKeys) {
          await provider.delete(key);
        }

        console.log(`Invalidated cache for ${model} ID: ${id}`);
      },
    }),
  };
};
