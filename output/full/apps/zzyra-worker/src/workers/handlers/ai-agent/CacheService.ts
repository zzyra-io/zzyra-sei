import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  metadata?: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
  memoryUsage: number;
}

interface ToolResultCacheKey {
  toolName: string;
  parameters: Record<string, any>;
  userId: string;
}

interface ReasoningCacheKey {
  prompt: string;
  systemPrompt: string;
  provider: string;
  model: string;
  thinkingMode: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: any = null;
  private memoryCache = new Map<string, CacheEntry>();
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    hitRate: 0,
    memoryUsage: 0,
  };

  // Cache TTL configurations (in seconds)
  private readonly cacheTTL = {
    toolResults: 1800, // 30 minutes
    reasoningSteps: 3600, // 1 hour
    providerHealth: 300, // 5 minutes
    toolDiscovery: 7200, // 2 hours
    userPreferences: 1800, // 30 minutes
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
    this.startStatsCalculation();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (!redisUrl) {
        this.logger.warn('Redis URL not configured, using memory-only cache');
        return;
      }

      // Dynamic import for Redis client
      const { createClient } = await import('redis');
      this.redis = createClient({ url: redisUrl });

      this.redis.on('error', (err: Error) => {
        this.logger.error('Redis client error:', err);
        this.redis = null; // Fall back to memory cache
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis cache');
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis cache:', error);
      this.redis = null; // Fall back to memory cache
    }
  }

  /**
   * Cache tool execution results with intelligent cache key generation
   */
  async cacheToolResult(
    key: ToolResultCacheKey,
    result: any,
    customTTL?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateToolCacheKey(key);
      const ttl = customTTL || this.cacheTTL.toolResults;

      const entry: CacheEntry = {
        data: result,
        timestamp: Date.now(),
        ttl: ttl * 1000, // Convert to milliseconds
        hits: 0,
        metadata: {
          toolName: key.toolName,
          parameterHash: this.hashParameters(key.parameters),
          userId: key.userId,
        },
      };

      await this.setCache(cacheKey, entry, ttl);
      this.logger.debug(`Cached tool result for ${key.toolName}`);
    } catch (error) {
      this.logger.error('Failed to cache tool result:', error);
    }
  }

  /**
   * Retrieve cached tool result
   */
  async getCachedToolResult(key: ToolResultCacheKey): Promise<any | null> {
    try {
      const cacheKey = this.generateToolCacheKey(key);
      const entry = await this.getCache<any>(cacheKey);

      if (entry) {
        this.logger.debug(`Cache hit for tool ${key.toolName}`);
        return entry.data;
      }

      this.logger.debug(`Cache miss for tool ${key.toolName}`);
      return null;
    } catch (error) {
      this.logger.error('Failed to get cached tool result:', error);
      return null;
    }
  }

  /**
   * Cache reasoning steps with context-aware caching
   */
  async cacheReasoningSteps(
    key: ReasoningCacheKey,
    steps: any[],
    customTTL?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateReasoningCacheKey(key);
      const ttl = customTTL || this.cacheTTL.reasoningSteps;

      const entry: CacheEntry = {
        data: steps,
        timestamp: Date.now(),
        ttl: ttl * 1000,
        hits: 0,
        metadata: {
          provider: key.provider,
          model: key.model,
          thinkingMode: key.thinkingMode,
          stepCount: steps.length,
          promptHash: this.hashString(key.prompt),
        },
      };

      await this.setCache(cacheKey, entry, ttl);
      this.logger.debug(`Cached ${steps.length} reasoning steps`);
    } catch (error) {
      this.logger.error('Failed to cache reasoning steps:', error);
    }
  }

  /**
   * Retrieve cached reasoning steps
   */
  async getCachedReasoningSteps(key: ReasoningCacheKey): Promise<any[] | null> {
    try {
      const cacheKey = this.generateReasoningCacheKey(key);
      const entry = await this.getCache<any[]>(cacheKey);

      if (entry) {
        this.logger.debug(`Cache hit for reasoning steps`);
        return entry.data;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get cached reasoning steps:', error);
      return null;
    }
  }

  /**
   * Cache provider health status
   */
  async cacheProviderHealth(
    providerType: string,
    isHealthy: boolean,
    customTTL?: number,
  ): Promise<void> {
    const cacheKey = `provider:health:${providerType}`;
    const ttl = customTTL || this.cacheTTL.providerHealth;

    const entry: CacheEntry = {
      data: { isHealthy, checkedAt: Date.now() },
      timestamp: Date.now(),
      ttl: ttl * 1000,
      hits: 0,
      metadata: { providerType },
    };

    await this.setCache(cacheKey, entry, ttl);
  }

  /**
   * Get cached provider health status
   */
  async getCachedProviderHealth(providerType: string): Promise<boolean | null> {
    try {
      const cacheKey = `provider:health:${providerType}`;
      const entry = await this.getCache<{
        isHealthy: boolean;
        checkedAt: number;
      }>(cacheKey);

      return entry ? entry.data.isHealthy : null;
    } catch (error) {
      this.logger.error('Failed to get cached provider health:', error);
      return null;
    }
  }

  /**
   * Cache tool discovery results
   */
  async cacheToolDiscovery(
    serverId: string,
    tools: any[],
    customTTL?: number,
  ): Promise<void> {
    const cacheKey = `tools:discovery:${serverId}`;
    const ttl = customTTL || this.cacheTTL.toolDiscovery;

    const entry: CacheEntry = {
      data: tools,
      timestamp: Date.now(),
      ttl: ttl * 1000,
      hits: 0,
      metadata: {
        serverId,
        toolCount: tools.length,
        toolNames: tools.map((t) => t.name),
      },
    };

    await this.setCache(cacheKey, entry, ttl);
  }

  /**
   * Get cached tool discovery results
   */
  async getCachedToolDiscovery(serverId: string): Promise<any[] | null> {
    try {
      const cacheKey = `tools:discovery:${serverId}`;
      const entry = await this.getCache<any[]>(cacheKey);

      return entry ? entry.data : null;
    } catch (error) {
      this.logger.error('Failed to get cached tool discovery:', error);
      return null;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      let deletedCount = 0;

      if (this.redis) {
        // Redis pattern-based deletion
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await this.redis.del(keys);
        }
      }

      // Memory cache pattern-based deletion
      for (const [key] of this.memoryCache) {
        if (this.matchesPattern(key, pattern)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }

      this.logger.debug(
        `Invalidated ${deletedCount} cache entries matching pattern: ${pattern}`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to invalidate cache by pattern:', error);
      return 0;
    }
  }

  /**
   * Clear expired entries and get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    await this.cleanupExpiredEntries();
    this.updateCacheStats();
    return { ...this.cacheStats };
  }

  /**
   * Warm up cache with frequently used data
   */
  async warmupCache(userId: string): Promise<void> {
    try {
      this.logger.log(`Warming up cache for user: ${userId}`);

      // Pre-cache common tool results and reasoning patterns
      // This would be implemented based on usage analytics

      // Example: Pre-cache common MCP server connections
      const commonTools = ['filesystem', 'brave-search', 'postgres'];

      for (const toolName of commonTools) {
        // Pre-warm tool discovery cache
        const cacheKey = `tools:discovery:${toolName}-server`;
        const existingEntry = await this.getCache(cacheKey);

        if (!existingEntry) {
          // This would trigger tool discovery and cache the results
          this.logger.debug(`Pre-warming tool discovery for: ${toolName}`);
        }
      }

      this.logger.log(`Cache warmup completed for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to warm up cache:', error);
    }
  }

  // Private helper methods
  private async setCache<T>(
    key: string,
    entry: CacheEntry<T>,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setEx(key, ttlSeconds, JSON.stringify(entry));
      } else {
        this.memoryCache.set(key, entry);
      }
      this.cacheStats.entries = this.memoryCache.size;
    } catch (error) {
      this.logger.error(`Failed to set cache entry ${key}:`, error);
      // Fall back to memory cache
      this.memoryCache.set(key, entry);
    }
  }

  private async getCache<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      let entry: CacheEntry<T> | null = null;

      if (this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          entry = JSON.parse(cached);
        }
      } else {
        entry = this.memoryCache.get(key) || null;
      }

      if (entry) {
        // Check if entry is expired (for memory cache)
        if (!this.redis && Date.now() - entry.timestamp > entry.ttl) {
          this.memoryCache.delete(key);
          this.cacheStats.misses++;
          return null;
        }

        // Increment hit counter
        entry.hits++;
        this.cacheStats.hits++;
        return entry;
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cache entry ${key}:`, error);
      this.cacheStats.misses++;
      return null;
    }
  }

  private generateToolCacheKey(key: ToolResultCacheKey): string {
    const paramHash = this.hashParameters(key.parameters);
    return `tool:${key.toolName}:${key.userId}:${paramHash}`;
  }

  private generateReasoningCacheKey(key: ReasoningCacheKey): string {
    const promptHash = this.hashString(key.prompt);
    const systemHash = this.hashString(key.systemPrompt);
    return `reasoning:${key.provider}:${key.model}:${key.thinkingMode}:${promptHash}:${systemHash}`;
  }

  private hashParameters(params: Record<string, any>): string {
    // Create a deterministic hash of parameters
    const sortedKeys = Object.keys(params).sort();
    const normalized = sortedKeys
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return this.hashString(normalized);
  }

  private hashString(input: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching with * wildcards
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const now = Date.now();
      let expiredCount = 0;

      // Clean up memory cache
      for (const [key, entry] of this.memoryCache) {
        if (now - entry.timestamp > entry.ttl) {
          this.memoryCache.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        this.logger.debug(`Cleaned up ${expiredCount} expired cache entries`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired entries:', error);
    }
  }

  private updateCacheStats(): void {
    this.cacheStats.entries = this.memoryCache.size;
    this.cacheStats.hitRate =
      this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) ||
      0;

    // Estimate memory usage
    let memoryUsage = 0;
    for (const [key, entry] of this.memoryCache) {
      memoryUsage += key.length + JSON.stringify(entry).length;
    }
    this.cacheStats.memoryUsage = memoryUsage;
  }

  private startStatsCalculation(): void {
    // Update stats every 5 minutes
    setInterval(
      () => {
        this.updateCacheStats();
      },
      5 * 60 * 1000,
    );
  }
}
