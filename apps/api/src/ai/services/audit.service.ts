import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource: string;
  action: string;
  details: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'partial';
  risk: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

enum AuditEventType {
  WORKFLOW_GENERATION = 'workflow_generation',
  WORKFLOW_VALIDATION = 'workflow_validation',
  SECURITY_VIOLATION = 'security_violation',
  BLOCK_GENERATION = 'block_generation',
  PROMPT_INJECTION = 'prompt_injection',
  CODE_EXECUTION = 'code_execution',
  USER_ACTION = 'user_action',
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_CHANGE = 'configuration_change',
  AUTH_EVENT = 'auth_event',
}

export interface GenerationMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageResponseTime: number;
  validationFailures: number;
  securityIssues: number;
  autoCorrections: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private events: AuditEvent[] = []; // In production, use proper storage
  private metrics: Map<string, unknown> = new Map();

  constructor(private configService: ConfigService) {}

  /**
   * Log workflow generation event
   */
  async logWorkflowGeneration(
    userId: string,
    sessionId: string,
    request: {
      description: string;
      options?: Record<string, unknown>;
      existingNodes?: unknown[];
      existingEdges?: unknown[];
    },
    response: {
      nodes: unknown[];
      edges: unknown[];
      validationResult?: unknown;
      processingTime: number;
      model: string;
    },
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      outcome: 'success' | 'failure' | 'partial';
      errors?: unknown[];
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventId: this.generateEventId(),
      eventType: AuditEventType.WORKFLOW_GENERATION,
      timestamp: new Date(),
      userId,
      sessionId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      resource: 'workflow',
      action: 'generate',
      details: {
        request: {
          description: this.sanitizeForLogging(request.description),
          options: request.options,
          nodeCount: request.existingNodes?.length || 0,
          edgeCount: request.existingEdges?.length || 0,
        },
        response: {
          generatedNodes: response.nodes.length,
          generatedEdges: response.edges.length,
          processingTime: response.processingTime,
          model: response.model,
          hasValidationIssues: !!response.validationResult,
        },
        errors: metadata.errors,
      },
      outcome: metadata.outcome,
      risk: this.assessRisk(metadata.outcome, metadata.errors?.length || 0),
      metadata: {
        timestamp: Date.now(),
        version: this.configService.get('APP_VERSION', '1.0.0'),
      },
    };

    await this.persistEvent(event);
    this.updateMetrics('workflow_generation', event);
    
    this.logger.log(`Workflow generation audit: ${event.eventId} - ${event.outcome}`);
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(
    userId: string | undefined,
    violation: {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      input?: string;
      context?: string;
    },
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventId: this.generateEventId(),
      eventType: AuditEventType.SECURITY_VIOLATION,
      timestamp: new Date(),
      userId,
      sessionId: metadata.sessionId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      resource: 'security',
      action: 'violation_detected',
      details: {
        violationType: violation.type,
        severity: violation.severity,
        description: violation.description,
        input: violation.input ? this.sanitizeForLogging(violation.input, 200) : undefined,
        context: violation.context,
      },
      outcome: 'failure',
      risk: violation.severity,
      metadata: {
        automated: true,
        timestamp: Date.now(),
      },
    };

    await this.persistEvent(event);
    this.updateMetrics('security_violations', event);
    
    // Trigger alerts for high/critical security violations
    if (violation.severity === 'high' || violation.severity === 'critical') {
      await this.triggerSecurityAlert(event);
    }
    
    this.logger.warn(`Security violation: ${event.eventId} - ${violation.type} (${violation.severity})`);
  }

  /**
   * Log validation event
   */
  async logValidation(
    userId: string,
    resource: string,
    validation: {
      isValid: boolean;
      errors: unknown[];
      warnings: unknown[];
      autoCorrections?: unknown[];
    },
    metadata: {
      sessionId?: string;
      processingTime?: number;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventId: this.generateEventId(),
      eventType: AuditEventType.WORKFLOW_VALIDATION,
      timestamp: new Date(),
      userId,
      sessionId: metadata.sessionId,
      resource,
      action: 'validate',
      details: {
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        autoCorrections: validation.autoCorrections?.length || 0,
        processingTime: metadata.processingTime,
      },
      outcome: validation.isValid ? 'success' : 'failure',
      risk: validation.errors.length > 5 ? 'medium' : 'low',
      metadata: {
        automated: true,
        timestamp: Date.now(),
      },
    };

    await this.persistEvent(event);
    this.updateMetrics('validations', event);
    
    this.logger.debug(`Validation audit: ${event.eventId} - ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
  }

  /**
   * Log user action
   */
  async logUserAction(
    userId: string,
    action: string,
    resource: string,
    details: Record<string, unknown>,
    metadata: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      outcome?: 'success' | 'failure' | 'partial';
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventId: this.generateEventId(),
      eventType: AuditEventType.USER_ACTION,
      timestamp: new Date(),
      userId,
      sessionId: metadata.sessionId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      resource,
      action,
      details,
      outcome: metadata.outcome || 'success',
      risk: 'low',
      metadata: {
        userInitiated: true,
        timestamp: Date.now(),
      },
    };

    await this.persistEvent(event);
    this.updateMetrics('user_actions', event);
    
    this.logger.debug(`User action audit: ${event.eventId} - ${action} on ${resource}`);
  }

  /**
   * Get audit events for a user
   */
  async getUserAuditTrail(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      eventTypes?: AuditEventType[];
      limit?: number;
    } = {}
  ): Promise<AuditEvent[]> {
    let events = this.events.filter(e => e.userId === userId);

    if (options.startDate) {
      events = events.filter(e => e.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      events = events.filter(e => e.timestamp <= options.endDate!);
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      events = events.filter(e => options.eventTypes!.includes(e.eventType));
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get system metrics
   */
  async getMetrics(timeRange?: { start: Date; end: Date }): Promise<GenerationMetrics> {
    let events = this.events;

    if (timeRange) {
      events = events.filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const workflowGenerations = events.filter(e => 
      e.eventType === AuditEventType.WORKFLOW_GENERATION
    );

    const successful = workflowGenerations.filter(e => e.outcome === 'success');
    const failed = workflowGenerations.filter(e => e.outcome === 'failure');
    const validationFailures = events.filter(e => 
      e.eventType === AuditEventType.WORKFLOW_VALIDATION && e.outcome === 'failure'
    );
    const securityIssues = events.filter(e => 
      e.eventType === AuditEventType.SECURITY_VIOLATION
    );

    const processingTimes = workflowGenerations
      .map(e => (e.details as any)?.response?.processingTime)
      .filter(time => typeof time === 'number');

    return {
      totalGenerations: workflowGenerations.length,
      successfulGenerations: successful.length,
      failedGenerations: failed.length,
      averageResponseTime: processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0,
      validationFailures: validationFailures.length,
      securityIssues: securityIssues.length,
      autoCorrections: events
        .filter(e => (e.details as any)?.autoCorrections > 0)
        .reduce((sum, e) => sum + ((e.details as any)?.autoCorrections || 0), 0),
    };
  }

  /**
   * Generate security report
   */
  async getSecurityReport(timeRange: { start: Date; end: Date }): Promise<{
    summary: {
      totalViolations: number;
      criticalViolations: number;
      highRiskViolations: number;
      topViolationTypes: Array<{ type: string; count: number }>;
    };
    trends: {
      dailyViolations: Array<{ date: string; count: number }>;
    };
    recommendations: string[];
  }> {
    const securityEvents = this.events.filter(e => 
      e.eventType === AuditEventType.SECURITY_VIOLATION &&
      e.timestamp >= timeRange.start && 
      e.timestamp <= timeRange.end
    );

    const criticalViolations = securityEvents.filter(e => e.risk === 'critical');
    const highRiskViolations = securityEvents.filter(e => e.risk === 'high');

    // Count violation types
    const violationTypes = new Map<string, number>();
    for (const event of securityEvents) {
      const type = (event.details as any)?.violationType || 'unknown';
      violationTypes.set(type, (violationTypes.get(type) || 0) + 1);
    }

    const topViolationTypes = Array.from(violationTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate daily trends
    const dailyViolations = new Map<string, number>();
    for (const event of securityEvents) {
      const date = event.timestamp.toISOString().split('T')[0];
      dailyViolations.set(date, (dailyViolations.get(date) || 0) + 1);
    }

    const trends = Array.from(dailyViolations.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalViolations.length > 0) {
      recommendations.push('Address critical security violations immediately');
    }
    if (topViolationTypes[0]?.count > 10) {
      recommendations.push(`Focus on preventing ${topViolationTypes[0].type} violations`);
    }
    if (securityEvents.length > 100) {
      recommendations.push('Consider implementing additional rate limiting');
    }

    return {
      summary: {
        totalViolations: securityEvents.length,
        criticalViolations: criticalViolations.length,
        highRiskViolations: highRiskViolations.length,
        topViolationTypes,
      },
      trends: { dailyViolations: trends },
      recommendations,
    };
  }

  /**
   * Private helper methods
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private sanitizeForLogging(input: string, maxLength: number = 500): string {
    // Remove sensitive patterns before logging
    let sanitized = input
      .replace(/(?:password|secret|key|token)\s*[:=]\s*["'][^"']*["']/gi, '[REDACTED]')
      .replace(/[a-zA-Z0-9+/]{32,}={0,2}/g, '[REDACTED_BASE64]');

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '... [TRUNCATED]';
    }

    return sanitized;
  }

  private assessRisk(outcome: string, errorCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (outcome === 'failure' && errorCount > 10) return 'high';
    if (outcome === 'failure' && errorCount > 5) return 'medium';
    if (errorCount > 0) return 'low';
    return 'low';
  }

  private async persistEvent(event: AuditEvent): Promise<void> {
    // In production, persist to database
    this.events.push(event);
    
    // Keep only recent events in memory (last 10000)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  private updateMetrics(type: string, event: AuditEvent): void {
    const key = `${type}_${event.timestamp.toISOString().split('T')[0]}`;
    const current = (this.metrics.get(key) as number) || 0;
    this.metrics.set(key, current + 1);
  }

  private async triggerSecurityAlert(event: AuditEvent): Promise<void> {
    // In production, integrate with alerting system (Slack, email, etc.)
    this.logger.error(`SECURITY ALERT: ${event.eventType} - ${(event.details as any)?.description}`, {
      eventId: event.eventId,
      userId: event.userId,
      risk: event.risk,
      timestamp: event.timestamp,
    });
  }
}