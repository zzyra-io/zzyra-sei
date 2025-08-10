import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';

interface SecurityViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  blockedAction: string;
  userId: string;
  timestamp: string;
  evidence?: Record<string, any>;
}

interface SecurityValidationResult {
  isValid: boolean;
  violations: SecurityViolation[];
  riskScore: number;
}

interface AIAgentConfig {
  provider: any;
  agent: {
    systemPrompt: string;
    userPrompt: string;
  };
  selectedTools: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  execution: any;
}

@Injectable()
export class SecurityValidator {
  private readonly logger = new Logger(SecurityValidator.name);

  private readonly SECURITY_PATTERNS = {
    PROMPT_INJECTION: [
      /ignore\s+previous\s+instructions/i,
      /system\s*:\s*you\s+are\s+now/i,
      /forget\s+everything\s+above/i,
      /disregard\s+all\s+previous/i,
      /<\s*script\s*>/i,
      /\{\{\s*.*\s*\}\}/,
    ],
    SENSITIVE_DATA: [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit cards
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // IP addresses
      /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/, // UUIDs
    ],
    MALICIOUS_KEYWORDS: [
      /system\.execute/i,
      /file\.delete/i,
      /rm\s+-rf/i,
      /sudo\s+/i,
      /passwd/i,
      /\/etc\/shadow/i,
    ],
  };

  private readonly BLOCKED_TOOLS = [
    'system-execute',
    'file-delete',
    'network-scan',
    'crypto-privatekey',
    'database-admin',
  ];

  constructor(private readonly databaseService: DatabaseService) {}

  async validateExecution(
    config: AIAgentConfig,
    userId: string,
    executionId: string,
  ): Promise<SecurityValidationResult> {
    const violations: SecurityViolation[] = [];

    // Validate prompts
    const promptViolations = this.validatePrompts(config.agent, userId);
    violations.push(...promptViolations);

    // Validate selected tools
    const toolViolations = await this.validateTools(
      config.selectedTools,
      userId,
    );
    violations.push(...toolViolations);

    // Check user permissions
    const permissionViolations = await this.validateUserPermissions(
      userId,
      config.selectedTools,
    );
    violations.push(...permissionViolations);

    // Log security events
    if (violations.length > 0) {
      await this.logSecurityEvents(violations, executionId);
    }

    const riskScore = this.calculateRiskScore(violations);

    return {
      isValid:
        violations.filter(
          (v) => v.severity === 'high' || v.severity === 'critical',
        ).length === 0,
      violations,
      riskScore,
    };
  }

  private validatePrompts(
    agent: AIAgentConfig['agent'],
    userId: string,
  ): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const timestamp = new Date().toISOString();

    // Check system prompt
    violations.push(
      ...this.checkPromptSecurity(
        agent.systemPrompt,
        'system_prompt',
        userId,
        timestamp,
      ),
    );

    // Check user prompt
    violations.push(
      ...this.checkPromptSecurity(
        agent.userPrompt,
        'user_prompt',
        userId,
        timestamp,
      ),
    );

    return violations;
  }

  private checkPromptSecurity(
    prompt: string,
    promptType: string,
    userId: string,
    timestamp: string,
  ): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    if (!prompt) return violations;

    // Check for prompt injection
    for (const pattern of this.SECURITY_PATTERNS.PROMPT_INJECTION) {
      if (pattern.test(prompt)) {
        violations.push({
          type: 'PROMPT_INJECTION',
          severity: 'high',
          description: `Potential prompt injection detected in ${promptType}`,
          blockedAction: `${promptType} execution`,
          userId,
          timestamp,
          evidence: {
            pattern: pattern.source,
            matched: pattern.exec(prompt)?.[0],
            promptType,
          },
        });
      }
    }

    // Check for sensitive data
    for (const pattern of this.SECURITY_PATTERNS.SENSITIVE_DATA) {
      if (pattern.test(prompt)) {
        violations.push({
          type: 'SENSITIVE_DATA_EXPOSURE',
          severity: 'medium',
          description: `Sensitive data detected in ${promptType}`,
          blockedAction: `${promptType} processing`,
          userId,
          timestamp,
          evidence: { promptType },
        });
      }
    }

    // Check for malicious keywords
    for (const pattern of this.SECURITY_PATTERNS.MALICIOUS_KEYWORDS) {
      if (pattern.test(prompt)) {
        violations.push({
          type: 'MALICIOUS_CONTENT',
          severity: 'high',
          description: `Malicious keywords detected in ${promptType}`,
          blockedAction: `${promptType} execution`,
          userId,
          timestamp,
          evidence: {
            pattern: pattern.source,
            promptType,
          },
        });
      }
    }

    return violations;
  }

  private async validateTools(
    selectedTools: AIAgentConfig['selectedTools'],
    userId: string,
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    const timestamp = new Date().toISOString();

    for (const tool of selectedTools) {
      // Check for blocked tools
      if (this.BLOCKED_TOOLS.includes(tool.id)) {
        violations.push({
          type: 'BLOCKED_TOOL',
          severity: 'critical',
          description: `Blocked tool detected: ${tool.name}`,
          blockedAction: `Tool execution: ${tool.id}`,
          userId,
          timestamp,
          evidence: { toolId: tool.id, toolName: tool.name },
        });
      }

      // Check tool-specific security rules
      const toolViolations = await this.validateSpecificTool(
        tool,
        userId,
        timestamp,
      );
      violations.push(...toolViolations);
    }

    return violations;
  }

  private async validateSpecificTool(
    tool: AIAgentConfig['selectedTools'][0],
    userId: string,
    timestamp: string,
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    // Blockchain tools security
    if (tool.type === 'goat' && tool.id.includes('wallet')) {
      const hasWalletPermission = await this.checkPermission(
        userId,
        'WALLET_ACCESS',
      );
      if (!hasWalletPermission) {
        violations.push({
          type: 'INSUFFICIENT_PERMISSIONS',
          severity: 'high',
          description: `Missing wallet access permission for ${tool.name}`,
          blockedAction: `Wallet tool access: ${tool.id}`,
          userId,
          timestamp,
          evidence: { toolId: tool.id, requiredPermission: 'WALLET_ACCESS' },
        });
      }
    }

    // Database tools security
    if (tool.type === 'mcp' && tool.id.includes('database')) {
      const hasDatabasePermission = await this.checkPermission(
        userId,
        'DATABASE_ACCESS',
      );
      if (!hasDatabasePermission) {
        violations.push({
          type: 'INSUFFICIENT_PERMISSIONS',
          severity: 'medium',
          description: `Missing database access permission for ${tool.name}`,
          blockedAction: `Database tool access: ${tool.id}`,
          userId,
          timestamp,
          evidence: { toolId: tool.id, requiredPermission: 'DATABASE_ACCESS' },
        });
      }
    }

    return violations;
  }

  private async validateUserPermissions(
    userId: string,
    selectedTools: AIAgentConfig['selectedTools'],
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    const timestamp = new Date().toISOString();

    try {
      // Check if user has AI_AGENT permission
      const hasAIAgentPermission = await this.checkPermission(
        userId,
        'AI_AGENT',
      );
      if (!hasAIAgentPermission) {
        violations.push({
          type: 'INSUFFICIENT_PERMISSIONS',
          severity: 'critical',
          description: 'User lacks AI Agent execution permission',
          blockedAction: 'AI Agent execution',
          userId,
          timestamp,
          evidence: { requiredPermission: 'AI_AGENT' },
        });
      }

      // Check tool-specific permissions
      for (const tool of selectedTools) {
        const requiredPermission = this.getRequiredPermission(tool);
        if (requiredPermission) {
          const hasPermission = await this.checkPermission(
            userId,
            requiredPermission,
          );
          if (!hasPermission) {
            violations.push({
              type: 'INSUFFICIENT_PERMISSIONS',
              severity: 'high',
              description: `Missing permission for tool: ${tool.name}`,
              blockedAction: `Tool access: ${tool.id}`,
              userId,
              timestamp,
              evidence: {
                toolId: tool.id,
                requiredPermission,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Permission validation error for user ${userId}:`,
        error,
      );
      violations.push({
        type: 'PERMISSION_CHECK_FAILED',
        severity: 'medium',
        description: 'Failed to validate user permissions',
        blockedAction: 'Permission validation',
        userId,
        timestamp,
        evidence: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return violations;
  }

  private async checkPermission(
    userId: string,
    permission: string,
  ): Promise<boolean> {
    try {
      // Check user permissions from database
      // This is a placeholder - implement based on your permission system
      const user = (await this.databaseService.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      })) as any; // Cast to any to handle mock permissions

      // Check if user exists and has the required permission
      if (user) {
        // For demo purposes, check the permissions array if it exists (mock implementation)
        if (user.permissions && Array.isArray(user.permissions)) {
          return user.permissions.includes(permission);
        }
        // Basic permission checks - for now, allow all authenticated users for AI_AGENT
        if (permission === 'AI_AGENT') return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Permission check failed for ${userId}:`, error);
      // Fallback to allowing permission for demo purposes
      return true;
    }
  }

  private getRequiredPermission(
    tool: AIAgentConfig['selectedTools'][0],
  ): string | null {
    const permissionMap = {
      wallet: 'WALLET_ACCESS',
      database: 'DATABASE_ACCESS',
      file: 'FILE_ACCESS',
      network: 'NETWORK_ACCESS',
      system: 'SYSTEM_ACCESS',
    };

    for (const [keyword, permission] of Object.entries(permissionMap)) {
      if (tool.id.toLowerCase().includes(keyword)) {
        return permission;
      }
    }

    return null;
  }

  private calculateRiskScore(violations: SecurityViolation[]): number {
    const weights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 10,
    };

    return violations.reduce((score, violation) => {
      return score + weights[violation.severity];
    }, 0);
  }

  private async logSecurityEvents(
    violations: SecurityViolation[],
    executionId: string,
  ): Promise<void> {
    try {
      for (const violation of violations) {
        // Log to execution logger for immediate visibility
        this.logger.warn(`Security violation: ${violation.type}`, {
          executionId,
          userId: violation.userId,
          severity: violation.severity,
          description: violation.description,
        });

        // Store in database for audit trail
        // This would require adding the aiAgentSecurityEvent model to Prisma
        // await this.databaseService.prisma.aiAgentSecurityEvent.create({
        //   data: {
        //     executionId,
        //     userId: violation.userId,
        //     violationType: violation.type,
        //     severity: violation.severity,
        //     description: violation.description,
        //     blockedAction: violation.blockedAction,
        //     evidence: violation.evidence || {},
        //   },
        // });
      }
    } catch (error) {
      this.logger.error('Failed to log security events:', error);
    }
  }
}
