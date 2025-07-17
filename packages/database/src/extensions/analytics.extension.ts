import { Prisma, PrismaClient } from "@prisma/client";

// Performance metrics interface
export interface QueryMetrics {
  model: string;
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  rowCount?: number;
  userId?: string;
  queryHash: string;
}

// Analytics aggregated data
export interface AnalyticsData {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  slowQueries: QueryMetrics[];
  queryBreakdown: Record<
    string,
    {
      count: number;
      avgDuration: number;
      failureRate: number;
    }
  >;
  modelBreakdown: Record<
    string,
    {
      count: number;
      avgDuration: number;
      failureRate: number;
    }
  >;
  performanceAlerts: string[];
}

// Analytics configuration
export interface AnalyticsConfig {
  enabled: boolean;
  trackSlowQueries: boolean;
  slowQueryThreshold: number; // milliseconds
  maxMetricsRetention: number; // number of metrics to keep in memory
  sampleRate: number; // 0.0 to 1.0, percentage of queries to track
  enableRealTimeAlerts: boolean;
  alertThresholds: {
    slowQueryThreshold: number;
    highFailureRate: number; // percentage
    avgDurationIncrease: number; // percentage increase from baseline
  };
  excludeModels: string[];
  excludeOperations: string[];
}

const defaultAnalyticsConfig: AnalyticsConfig = {
  enabled: true,
  trackSlowQueries: true,
  slowQueryThreshold: 1000, // 1 second
  maxMetricsRetention: 10000,
  sampleRate: 1.0, // Track all queries by default
  enableRealTimeAlerts: true,
  alertThresholds: {
    slowQueryThreshold: 5000, // 5 seconds
    highFailureRate: 10, // 10%
    avgDurationIncrease: 50, // 50% increase
  },
  excludeModels: ["executionLog"],
  excludeOperations: [],
};

/**
 * Analytics storage interface
 */
export interface AnalyticsStore {
  saveMetric(metric: QueryMetrics): Promise<void>;
  getMetrics(filters: {
    model?: string;
    operation?: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<QueryMetrics[]>;
  getAggregatedData(timeRange: {
    start: Date;
    end: Date;
  }): Promise<AnalyticsData>;
  clearOldMetrics(olderThan: Date): Promise<number>;
}

/**
 * In-memory analytics store for development
 */
export class MemoryAnalyticsStore implements AnalyticsStore {
  private metrics: QueryMetrics[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  async saveMetric(metric: QueryMetrics): Promise<void> {
    this.metrics.push(metric);

    // Keep only the latest metrics
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }
  }

  async getMetrics(filters: {
    model?: string;
    operation?: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<QueryMetrics[]> {
    let filtered = this.metrics;

    if (filters.model) {
      filtered = filtered.filter((m) => m.model === filters.model);
    }
    if (filters.operation) {
      filtered = filtered.filter((m) => m.operation === filters.operation);
    }
    if (filters.userId) {
      filtered = filtered.filter((m) => m.userId === filters.userId);
    }
    if (filters.startTime) {
      filtered = filtered.filter((m) => m.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
      filtered = filtered.filter((m) => m.timestamp <= filters.endTime!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  async getAggregatedData(timeRange: {
    start: Date;
    end: Date;
  }): Promise<AnalyticsData> {
    const filteredMetrics = this.metrics.filter(
      (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );

    const totalQueries = filteredMetrics.length;
    const successfulQueries = filteredMetrics.filter((m) => m.success).length;
    const failedQueries = totalQueries - successfulQueries;

    const durations = filteredMetrics.map((m) => m.duration);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    const slowQueries = filteredMetrics
      .filter((m) => m.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Query breakdown
    const queryBreakdown: Record<string, any> = {};
    const modelBreakdown: Record<string, any> = {};

    filteredMetrics.forEach((metric) => {
      const queryKey = `${metric.model}.${metric.operation}`;

      if (!queryBreakdown[queryKey]) {
        queryBreakdown[queryKey] = { count: 0, totalDuration: 0, failures: 0 };
      }
      queryBreakdown[queryKey].count++;
      queryBreakdown[queryKey].totalDuration += metric.duration;
      if (!metric.success) queryBreakdown[queryKey].failures++;

      if (!modelBreakdown[metric.model]) {
        modelBreakdown[metric.model] = {
          count: 0,
          totalDuration: 0,
          failures: 0,
        };
      }
      modelBreakdown[metric.model].count++;
      modelBreakdown[metric.model].totalDuration += metric.duration;
      if (!metric.success) modelBreakdown[metric.model].failures++;
    });

    // Calculate averages and failure rates
    Object.keys(queryBreakdown).forEach((key) => {
      const data = queryBreakdown[key];
      data.avgDuration = data.totalDuration / data.count;
      data.failureRate = (data.failures / data.count) * 100;
      delete data.totalDuration;
      delete data.failures;
    });

    Object.keys(modelBreakdown).forEach((key) => {
      const data = modelBreakdown[key];
      data.avgDuration = data.totalDuration / data.count;
      data.failureRate = (data.failures / data.count) * 100;
      delete data.totalDuration;
      delete data.failures;
    });

    // Generate performance alerts
    const performanceAlerts: string[] = [];
    if (avgDuration > 2000) {
      performanceAlerts.push(
        `High average query duration: ${avgDuration.toFixed(2)}ms`
      );
    }
    if (failedQueries / totalQueries > 0.05) {
      performanceAlerts.push(
        `High failure rate: ${((failedQueries / totalQueries) * 100).toFixed(2)}%`
      );
    }
    if (slowQueries.length > totalQueries * 0.1) {
      performanceAlerts.push(
        `High number of slow queries: ${slowQueries.length}`
      );
    }

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      avgDuration,
      minDuration,
      maxDuration,
      slowQueries,
      queryBreakdown,
      modelBreakdown,
      performanceAlerts,
    };
  }

  async clearOldMetrics(olderThan: Date): Promise<number> {
    const initialCount = this.metrics.length;
    this.metrics = this.metrics.filter((m) => m.timestamp >= olderThan);
    return initialCount - this.metrics.length;
  }
}

/**
 * Database-backed analytics store using Prisma models
 */
export class DatabaseAnalyticsStore implements AnalyticsStore {
  constructor(private prisma: PrismaClient) {}

  async saveMetric(metric: QueryMetrics): Promise<void> {
    await (this.prisma as any).queryPerformance.create({
      data: {
        queryHash: metric.queryHash,
        queryType: metric.operation,
        tableName: metric.model,
        executionTime: metric.duration,
        rowsAffected: metric.rowCount,
        userId: metric.userId,
        timestamp: metric.timestamp,
      },
    });
  }

  async getMetrics(filters: {
    model?: string;
    operation?: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<QueryMetrics[]> {
    const where: any = {};

    if (filters.operation) {
      where.queryType = filters.operation;
    }
    if (filters.model) {
      where.tableName = filters.model;
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.startTime) {
      where.timestamp = { gte: filters.startTime };
    }
    if (filters.endTime) {
      where.timestamp = { ...where.timestamp, lte: filters.endTime };
    }

    const records = await (this.prisma as any).queryPerformance.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: filters.limit || 1000,
    });

    return records.map((record: any) => ({
      id: record.id,
      model: record.tableName,
      operation: record.queryType,
      args: {}, // We don't store args for security reasons
      duration: record.executionTime,
      rowsAffected: record.rowsAffected,
      timestamp: record.timestamp,
      success: true, // Assume success if recorded
      error: null,
      userId: record.userId,
      sessionId: record.sessionId,
      stackTrace: record.stackTrace,
    }));
  }

  async getAggregatedData(timeRange: {
    start: Date;
    end: Date;
  }): Promise<AnalyticsData> {
    const metrics = await this.getMetrics({
      startTime: timeRange.start,
      endTime: timeRange.end,
    });

    const totalQueries = metrics.length;
    const successfulQueries = metrics.filter((m) => m.success).length;
    const failedQueries = totalQueries - successfulQueries;

    const durations = metrics.map((m) => m.duration);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    const slowQueries = metrics
      .filter((m) => m.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Query and model breakdowns
    const queryBreakdown: Record<string, any> = {};
    const modelBreakdown: Record<string, any> = {};

    metrics.forEach((metric) => {
      // Query breakdown
      const op = metric.operation || "unknown";
      if (!queryBreakdown[op]) {
        queryBreakdown[op] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      queryBreakdown[op].count++;
      queryBreakdown[op].totalDuration += metric.duration;
      queryBreakdown[op].avgDuration =
        queryBreakdown[op].totalDuration / queryBreakdown[op].count;

      // Model breakdown
      const model = metric.model || "unknown";
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      modelBreakdown[model].count++;
      modelBreakdown[model].totalDuration += metric.duration;
      modelBreakdown[model].avgDuration =
        modelBreakdown[model].totalDuration / modelBreakdown[model].count;
    });

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      avgDuration: Math.round(avgDuration * 100) / 100,
      minDuration: Math.round(minDuration * 100) / 100,
      maxDuration: Math.round(maxDuration * 100) / 100,
      slowQueries,
      queryBreakdown,
      modelBreakdown,
      performanceAlerts: [], // Could be populated with detected performance issues
    };
  }

  async clearOldMetrics(olderThan: Date): Promise<number> {
    const result = await (this.prisma as any).queryPerformance.deleteMany({
      where: {
        timestamp: { lt: olderThan },
      },
    });

    return result.count;
  }
}

/**
 * Generate a hash for query identification
 */
function generateQueryHash(
  model: string,
  operation: string,
  args: any
): string {
  const querySignature = `${model}.${operation}`;
  const argsString = JSON.stringify(args, (key, value) => {
    // Exclude dynamic values for consistent hashing
    if (typeof value === "string" && value.match(/^[0-9a-f-]{36}$/)) {
      return "[UUID]";
    }
    if (key === "createdAt" || key === "updatedAt") {
      return "[TIMESTAMP]";
    }
    return value;
  });

  // Simple hash function
  let hash = 0;
  const combined = querySignature + argsString;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(16);
}

/**
 * Check if query should be sampled
 */
function shouldSample(sampleRate: number): boolean {
  return Math.random() <= sampleRate;
}

/**
 * Performance Analytics Extension
 *
 * Tracks database query performance and provides insights
 */
export const createAnalyticsExtension = (
  store: AnalyticsStore,
  config: Partial<AnalyticsConfig> = {},
  userId?: string
) => {
  const finalConfig = { ...defaultAnalyticsConfig, ...config };

  const recordMetric = async (
    model: string,
    operation: string,
    duration: number,
    success: boolean,
    args: any,
    error?: string,
    rowCount?: number
  ) => {
    if (!finalConfig.enabled || !shouldSample(finalConfig.sampleRate)) {
      return;
    }

    if (
      finalConfig.excludeModels.includes(model) ||
      finalConfig.excludeOperations.includes(operation)
    ) {
      return;
    }

    const metric: QueryMetrics = {
      model,
      operation,
      duration,
      timestamp: new Date(),
      success,
      error,
      rowCount,
      userId,
      queryHash: generateQueryHash(model, operation, args),
    };

    try {
      await store.saveMetric(metric);

      // Check for real-time alerts
      if (finalConfig.enableRealTimeAlerts) {
        if (duration > finalConfig.alertThresholds.slowQueryThreshold) {
          console.warn(
            `[ANALYTICS ALERT] Slow query detected: ${model}.${operation} took ${duration}ms`,
            {
              model,
              operation,
              duration,
              userId,
              queryHash: metric.queryHash,
            }
          );
        }
      }
    } catch (error) {
      console.warn("Failed to record analytics metric:", error);
    }
  };

  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      name: "PerformanceAnalytics",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const startTime = Date.now();
            let success = true;
            let error: string | undefined;
            let result: any;
            let rowCount: number | undefined;

            try {
              result = await query(args);

              // Calculate row count for relevant operations
              if (Array.isArray(result)) {
                rowCount = result.length;
              } else if (result && typeof result === "object") {
                rowCount = 1;
              }

              return result;
            } catch (err: any) {
              success = false;
              error = err.message || "Unknown error";
              throw err;
            } finally {
              const duration = Date.now() - startTime;

              // Record the metric asynchronously to not block the query
              setImmediate(() => {
                recordMetric(
                  model,
                  operation,
                  duration,
                  success,
                  args,
                  error,
                  rowCount
                );
              });
            }
          },
        },
      },
    })
  );
};

/**
 * Analytics utilities
 */
export const createAnalyticsUtils = (store: AnalyticsStore) => {
  return {
    async getPerformanceReport(timeRange: {
      start: Date;
      end: Date;
    }): Promise<AnalyticsData> {
      return store.getAggregatedData(timeRange);
    },

    async getSlowQueries(
      threshold: number = 1000,
      limit: number = 20
    ): Promise<QueryMetrics[]> {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const metrics = await store.getMetrics({
        startTime,
        endTime,
        limit: 1000, // Get more to filter
      });

      return metrics
        .filter((m) => m.duration > threshold)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, limit);
    },

    async getUserQueryStats(
      userId: string,
      days: number = 7
    ): Promise<{
      totalQueries: number;
      avgDuration: number;
      topModels: Array<{ model: string; count: number }>;
      recentActivity: QueryMetrics[];
    }> {
      const endTime = new Date();
      const startTime = new Date(
        endTime.getTime() - days * 24 * 60 * 60 * 1000
      );

      const metrics = await store.getMetrics({
        userId,
        startTime,
        endTime,
      });

      const totalQueries = metrics.length;
      const avgDuration =
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
          : 0;

      // Count by model
      const modelCounts: Record<string, number> = {};
      metrics.forEach((m) => {
        modelCounts[m.model] = (modelCounts[m.model] || 0) + 1;
      });

      const topModels = Object.entries(modelCounts)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const recentActivity = metrics.slice(0, 10);

      return {
        totalQueries,
        avgDuration,
        topModels,
        recentActivity,
      };
    },

    async identifyBottlenecks(): Promise<{
      slowestQueries: Array<{
        query: string;
        avgDuration: number;
        count: number;
      }>;
      highFailureOperations: Array<{
        operation: string;
        failureRate: number;
        count: number;
      }>;
      recommendations: string[];
    }> {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      const data = await store.getAggregatedData({
        start: startTime,
        end: endTime,
      });

      // Find slowest queries
      const slowestQueries = Object.entries(data.queryBreakdown)
        .filter(([_, stats]) => stats.count >= 5) // Only consider queries with enough samples
        .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
        .slice(0, 10)
        .map(([query, stats]) => ({
          query,
          avgDuration: stats.avgDuration,
          count: stats.count,
        }));

      // Find high failure operations
      const highFailureOperations = Object.entries(data.queryBreakdown)
        .filter(([_, stats]) => stats.failureRate > 5 && stats.count >= 3)
        .sort((a, b) => b[1].failureRate - a[1].failureRate)
        .slice(0, 10)
        .map(([operation, stats]) => ({
          operation,
          failureRate: stats.failureRate,
          count: stats.count,
        }));

      // Generate recommendations
      const recommendations: string[] = [];

      if (data.avgDuration > 1000) {
        recommendations.push(
          "Consider adding database indexes for frequently queried fields"
        );
      }

      if (slowestQueries.length > 0) {
        recommendations.push(
          `Optimize slow queries, particularly: ${slowestQueries[0].query}`
        );
      }

      if (data.failedQueries / data.totalQueries > 0.02) {
        recommendations.push("Investigate and fix high query failure rate");
      }

      if (highFailureOperations.length > 0) {
        recommendations.push(
          `Review error handling for: ${highFailureOperations[0].operation}`
        );
      }

      return {
        slowestQueries,
        highFailureOperations,
        recommendations,
      };
    },

    async generateHealthReport(): Promise<{
      status: "healthy" | "warning" | "critical";
      metrics: {
        avgResponseTime: number;
        errorRate: number;
        queryVolume: number;
        slowQueryCount: number;
      };
      issues: string[];
      recommendations: string[];
    }> {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

      const data = await store.getAggregatedData({
        start: startTime,
        end: endTime,
      });

      const metrics = {
        avgResponseTime: data.avgDuration,
        errorRate: (data.failedQueries / data.totalQueries) * 100,
        queryVolume: data.totalQueries,
        slowQueryCount: data.slowQueries.length,
      };

      const issues: string[] = [];
      const recommendations: string[] = [];
      let status: "healthy" | "warning" | "critical" = "healthy";

      // Check response time
      if (metrics.avgResponseTime > 2000) {
        status = "critical";
        issues.push(
          `Very slow average response time: ${metrics.avgResponseTime.toFixed(2)}ms`
        );
        recommendations.push("Immediate database optimization required");
      } else if (metrics.avgResponseTime > 1000) {
        status = "warning";
        issues.push(
          `Slow average response time: ${metrics.avgResponseTime.toFixed(2)}ms`
        );
        recommendations.push("Consider database optimization");
      }

      // Check error rate
      if (metrics.errorRate > 5) {
        status = "critical";
        issues.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
        recommendations.push("Investigate and fix query errors immediately");
      } else if (metrics.errorRate > 2) {
        if (status === "healthy") status = "warning";
        issues.push(`Elevated error rate: ${metrics.errorRate.toFixed(2)}%`);
        recommendations.push("Monitor and fix query errors");
      }

      // Check slow queries
      if (metrics.slowQueryCount > 10) {
        if (status === "healthy") status = "warning";
        issues.push(`High number of slow queries: ${metrics.slowQueryCount}`);
        recommendations.push("Optimize slow performing queries");
      }

      return {
        status,
        metrics,
        issues,
        recommendations,
      };
    },

    async cleanupOldMetrics(days: number = 30): Promise<number> {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return store.clearOldMetrics(cutoffDate);
    },
  };
};
