"use client";

import { PerformanceMetric } from "@/lib/types";

/**
 * Application telemetry service for performance monitoring and error tracking
 * This service implements the monitoring aspects mentioned in your production readiness plans
 */
class MonitoringService {
  private enabled: boolean;
  private metricsBuffer: PerformanceMetric[] = [];
  private bufferSize: number = 20;
  private flushInterval: number | null = null;
  private errorBuffer: any[] = [];
  
  constructor() {
    // Enable monitoring in production and when explicitly enabled in development
    this.enabled = process.env.NODE_ENV === 'production' || 
                  process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true';
    
    // Start flush interval in client environment
    if (typeof window !== 'undefined' && this.enabled) {
      this.startFlushInterval();
    }
  }
  
  /**
   * Track a performance metric for workflow operations
   */
  trackPerformance(
    component: string, 
    action: string, 
    duration: number, 
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) return;
    
    const metric: PerformanceMetric = {
      component,
      action,
      duration,
      timestamp: Date.now(),
      metadata,
    };
    
    this.metricsBuffer.push(metric);
    
    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`[Performance] Slow operation detected: ${component}.${action} took ${duration.toFixed(2)}ms`, metadata);
    }
    
    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetrics();
    }
  }
  
  /**
   * Track workflow execution performance
   */
  trackWorkflowExecution(
    workflowId: string,
    executionId: string,
    executionTime: number,
    nodeCount: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.enabled) return;
    
    this.trackPerformance('workflow', 'execute', executionTime, {
      workflowId,
      executionId,
      nodeCount,
      success,
      error,
    });
  }
  
  /**
   * Track workflow builder UI performance
   */
  trackBuilderPerformance(
    action: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) return;
    
    this.trackPerformance('builder', action, duration, metadata);
  }
  
  /**
   * Track application errors with context
   */
  trackError(
    errorType: string,
    message: string,
    context?: Record<string, any>,
    isFatal: boolean = false
  ): void {
    if (!this.enabled) return;
    
    const errorData = {
      type: errorType,
      message,
      context,
      timestamp: Date.now(),
      isFatal,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    
    this.errorBuffer.push(errorData);
    
    // Always log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Error] ${errorType}: ${message}`, context);
    }
    
    // Immediately flush fatal errors
    if (isFatal) {
      this.flushErrors();
    }
  }
  
  /**
   * Start periodic flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval !== null) return;
    
    this.flushInterval = window.setInterval(() => {
      this.flushMetrics();
      this.flushErrors();
    }, 30000) as unknown as number; // 30 seconds
  }
  
  /**
   * Stop flush interval
   */
  stopFlushInterval(): void {
    if (this.flushInterval === null) return;
    
    clearInterval(this.flushInterval);
    this.flushInterval = null;
  }
  
  /**
   * Flush performance metrics to backend
   */
  private async flushMetrics(): Promise<void> {
    if (!this.enabled || this.metricsBuffer.length === 0) return;
    
    try {
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];
      
      // In production, send to monitoring endpoint
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/monitoring/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metrics }),
        });
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Don't re-add to buffer to avoid infinite loop
    }
  }
  
  /**
   * Flush error data to backend
   */
  private async flushErrors(): Promise<void> {
    if (!this.enabled || this.errorBuffer.length === 0) return;
    
    try {
      const errors = [...this.errorBuffer];
      this.errorBuffer = [];
      
      // In production, send to monitoring endpoint
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/monitoring/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ errors }),
        });
      }
    } catch (error) {
      console.error('Failed to flush errors:', error);
      // Don't re-add to buffer to avoid infinite loop
    }
  }
}

// Export as singleton
export const monitoringService = new MonitoringService();
