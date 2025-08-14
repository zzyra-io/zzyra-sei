import { Injectable, Logger } from "@nestjs/common";
import { performance } from "perf_hooks";

interface Metric {
  name: string;
  value: number;
  unit: "ms" | "count" | "bytes" | "percent";
  timestamp: Date;
  labels: Record<string, string>;
}

interface Alert {
  id: string;
  name: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata: Record<string, unknown>;
}

interface PerformanceTrace {
  traceId: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: "pending" | "success" | "error";
  metadata: Record<string, unknown>;
  spans: Array<{
    name: string;
    startTime: number;
    endTime: number;
    duration: number;
    tags: Record<string, string>;
  }>;
}

interface HealthCheck {
  name: string;
  status: "healthy" | "unhealthy" | "degraded";
  lastCheck: Date;
  responseTime: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private metrics = new Map<string, Metric[]>();
  private alerts: Alert[] = [];
  private traces = new Map<string, PerformanceTrace>();
  private healthChecks = new Map<string, HealthCheck>();

  constructor() {
    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: Metric["unit"] = "count",
    labels: Record<string, string> = {}
  ): void {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      labels,
    };

    const existing = this.metrics.get(name) || [];
    existing.push(metric);

    // Keep only last 1000 metrics per name
    if (existing.length > 1000) {
      existing.shift();
    }

    this.metrics.set(name, existing);

    // Check for alert conditions
    this.checkAlerts(metric);
  }

  /**
   * Start a performance trace
   */
  startTrace(
    operationName: string,
    metadata: Record<string, unknown> = {}
  ): string {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const trace: PerformanceTrace = {
      traceId,
      operationName,
      startTime: performance.now(),
      status: "pending",
      metadata,
      spans: [],
    };

    this.traces.set(traceId, trace);
    return traceId;
  }

  /**
   * End a performance trace
   */
  endTrace(
    traceId: string,
    status: "success" | "error" = "success",
    error?: Error
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      this.logger.warn(`Trace ${traceId} not found`);
      return;
    }

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;

    if (error) {
      trace.metadata.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    // Record as metric
    this.recordMetric(`operation_duration`, trace.duration, "ms", {
      operation: trace.operationName,
      status: trace.status,
    });

    this.recordMetric(`operation_count`, 1, "count", {
      operation: trace.operationName,
      status: trace.status,
    });

    // Log long-running operations
    if (trace.duration > 5000) {
      // 5 seconds
      this.logger.warn(
        `Slow operation detected: ${trace.operationName} took ${trace.duration}ms`
      );
    }

    // Clean up old traces
    setTimeout(() => {
      this.traces.delete(traceId);
    }, 300000); // 5 minutes
  }

  /**
   * Add a span to an existing trace
   */
  addSpan(
    traceId: string,
    spanName: string,
    startTime: number,
    endTime: number,
    tags: Record<string, string> = {}
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      this.logger.warn(`Trace ${traceId} not found for span ${spanName}`);
      return;
    }

    trace.spans.push({
      name: spanName,
      startTime,
      endTime,
      duration: endTime - startTime,
      tags,
    });
  }

  /**
   * Create an alert
   */
  createAlert(
    name: string,
    severity: Alert["severity"],
    message: string,
    metadata: Record<string, unknown> = {}
  ): string {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata,
    };

    this.alerts.push(alert);

    // Log based on severity
    switch (severity) {
      case "critical":
        this.logger.error(`CRITICAL ALERT: ${name} - ${message}`, metadata);
        break;
      case "error":
        this.logger.error(`ERROR ALERT: ${name} - ${message}`, metadata);
        break;
      case "warning":
        this.logger.warn(`WARNING ALERT: ${name} - ${message}`, metadata);
        break;
      case "info":
        this.logger.log(`INFO ALERT: ${name} - ${message}`, metadata);
        break;
    }

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }

    return alert.id;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    this.logger.log(`Alert resolved: ${alert.name}`);
    return true;
  }

  /**
   * Get metrics by name
   */
  getMetrics(
    name: string,
    timeRange?: { start: Date; end: Date },
    labels?: Record<string, string>
  ): Metric[] {
    let metrics = this.metrics.get(name) || [];

    if (timeRange) {
      metrics = metrics.filter(
        (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    if (labels) {
      metrics = metrics.filter((m) => {
        return Object.entries(labels).every(
          ([key, value]) => m.labels[key] === value
        );
      });
    }

    return metrics;
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    name: string,
    aggregation: "sum" | "avg" | "min" | "max" | "count",
    timeRange?: { start: Date; end: Date },
    labels?: Record<string, string>
  ): number {
    const metrics = this.getMetrics(name, timeRange, labels);

    if (metrics.length === 0) {
      return 0;
    }

    const values = metrics.map((m) => m.value);

    switch (aggregation) {
      case "sum":
        return values.reduce((a, b) => a + b, 0);
      case "avg":
        return values.reduce((a, b) => a + b, 0) / values.length;
      case "min":
        return Math.min(...values);
      case "max":
        return Math.max(...values);
      case "count":
        return values.length;
      default:
        return 0;
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: "healthy" | "degraded" | "unhealthy";
    checks: HealthCheck[];
    summary: {
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const checks = Array.from(this.healthChecks.values());
    const summary = {
      healthy: checks.filter((c) => c.status === "healthy").length,
      degraded: checks.filter((c) => c.status === "degraded").length,
      unhealthy: checks.filter((c) => c.status === "unhealthy").length,
    };

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (summary.unhealthy > 0) {
      overallStatus = "unhealthy";
    } else if (summary.degraded > 0) {
      overallStatus = "degraded";
    }

    return {
      status: overallStatus,
      checks,
      summary,
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange?: { start: Date; end: Date }): {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    slowRequests: number;
    throughput: number; // requests per minute
  } {
    const durationMetrics = this.getMetrics("operation_duration", timeRange);

    const totalRequests = this.getAggregatedMetrics(
      "operation_count",
      "sum",
      timeRange
    );
    const errorCount = this.getAggregatedMetrics(
      "operation_count",
      "sum",
      timeRange,
      { status: "error" }
    );

    const averageResponseTime =
      durationMetrics.length > 0
        ? this.getAggregatedMetrics("operation_duration", "avg", timeRange)
        : 0;

    const slowRequests = durationMetrics.filter((m) => m.value > 5000).length;

    // Calculate throughput (requests per minute)
    const timeRangeMs = timeRange
      ? timeRange.end.getTime() - timeRange.start.getTime()
      : 60000; // Default to 1 minute
    const throughput = (totalRequests / timeRangeMs) * 60000;

    const errorRate =
      totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      averageResponseTime,
      totalRequests,
      errorRate,
      slowRequests,
      throughput,
    };
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): PerformanceTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get all active traces
   */
  getActiveTraces(): PerformanceTrace[] {
    return Array.from(this.traces.values()).filter(
      (t) => t.status === "pending"
    );
  }

  /**
   * Register a custom health check
   */
  registerHealthCheck(
    name: string,
    checkFunction: () => Promise<{
      status: HealthCheck["status"];
      error?: string;
      metadata?: Record<string, unknown>;
    }>
  ): void {
    const runCheck = async () => {
      const startTime = performance.now();
      try {
        const result = await checkFunction();
        const responseTime = performance.now() - startTime;

        this.healthChecks.set(name, {
          name,
          status: result.status,
          lastCheck: new Date(),
          responseTime,
          error: result.error,
          metadata: result.metadata,
        });

        if (result.status !== "healthy") {
          this.createAlert(
            `health_check_${name}`,
            result.status === "unhealthy" ? "error" : "warning",
            `Health check ${name} is ${result.status}`,
            { error: result.error, metadata: result.metadata }
          );
        }
      } catch (error) {
        const responseTime = performance.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        this.healthChecks.set(name, {
          name,
          status: "unhealthy",
          lastCheck: new Date(),
          responseTime,
          error: errorMessage,
        });

        this.createAlert(
          `health_check_${name}`,
          "error",
          `Health check ${name} failed: ${errorMessage}`
        );
      }
    };

    // Run immediately and then every 30 seconds
    runCheck();
    setInterval(runCheck, 30000);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;

      const latest = metrics[metrics.length - 1];

      // Add help and type
      lines.push(`# HELP ${name} Generated metric from Zzyra AI service`);
      lines.push(`# TYPE ${name} gauge`);

      // Add labels
      const labelStr = Object.entries(latest.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(",");

      const labelsFormatted = labelStr ? `{${labelStr}}` : "";
      lines.push(`${name}${labelsFormatted} ${latest.value}`);
    }

    return lines.join("\n");
  }

  /**
   * Private methods
   */
  private initializeHealthChecks(): void {
    // Memory usage check
    this.registerHealthCheck("memory_usage", async () => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const usage_percent = (heapUsedMB / heapTotalMB) * 100;

      let status: HealthCheck["status"] = "healthy";
      if (usage_percent > 90) status = "unhealthy";
      else if (usage_percent > 75) status = "degraded";

      return {
        status,
        metadata: {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(heapTotalMB),
          usage_percent: Math.round(usage_percent),
        },
      };
    });

    // Event loop lag check
    this.registerHealthCheck("event_loop_lag", async () => {
      return new Promise((resolve) => {
        const start = performance.now();
        setImmediate(() => {
          const lag = performance.now() - start;
          let status: HealthCheck["status"] = "healthy";

          if (lag > 100) status = "unhealthy";
          else if (lag > 50) status = "degraded";

          resolve({
            status,
            metadata: { lag: Math.round(lag) },
          });
        });
      });
    });
  }

  private startMetricsCollection(): void {
    // Collect system metrics every 10 seconds
    setInterval(() => {
      const usage = process.memoryUsage();

      this.recordMetric("memory_heap_used", usage.heapUsed, "bytes");
      this.recordMetric("memory_heap_total", usage.heapTotal, "bytes");
      this.recordMetric("memory_external", usage.external, "bytes");

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.recordMetric("cpu_user", cpuUsage.user, "count");
      this.recordMetric("cpu_system", cpuUsage.system, "count");
    }, 10000);
  }

  private checkAlerts(metric: Metric): void {
    // High error rate alert
    if (metric.name === "operation_count" && metric.labels.status === "error") {
      const recentErrors = this.getMetrics(
        "operation_count",
        {
          start: new Date(Date.now() - 300000), // Last 5 minutes
          end: new Date(),
        },
        { status: "error" }
      );

      if (recentErrors.length > 10) {
        this.createAlert(
          "high_error_rate",
          "warning",
          `High error rate detected: ${recentErrors.length} errors in the last 5 minutes`
        );
      }
    }

    // Slow operations alert
    if (metric.name === "operation_duration" && metric.value > 10000) {
      this.createAlert(
        "slow_operation",
        "warning",
        `Slow operation detected: ${metric.labels.operation} took ${Math.round(metric.value)}ms`
      );
    }

    // Memory usage alert
    if (
      metric.name === "memory_heap_used" &&
      metric.value > 1024 * 1024 * 1024
    ) {
      // 1GB
      this.createAlert(
        "high_memory_usage",
        "warning",
        `High memory usage detected: ${Math.round(metric.value / 1024 / 1024)}MB`
      );
    }
  }
}
