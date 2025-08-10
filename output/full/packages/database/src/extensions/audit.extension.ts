import { Prisma, PrismaClient } from "@prisma/client";

export interface AuditConfig {
  enabled: boolean;
  logReads: boolean;
  logWrites: boolean;
  includeOldValues: boolean;
  sanitizeData: boolean;
  complianceLevel: "basic" | "gdpr" | "hipaa" | "sox";
  retentionDays: number;
  excludeModels: string[];
  excludeFields: string[];
}

export interface AuditContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  traceId?: string;
}

const defaultAuditConfig: AuditConfig = {
  enabled: true,
  logReads: false, // Usually too noisy
  logWrites: true,
  includeOldValues: false, // Simplified for now
  sanitizeData: true,
  complianceLevel: "basic",
  retentionDays: 90,
  excludeModels: ["AuditLog", "ComplianceAuditLog"],
  excludeFields: ["password", "token", "secret", "key"],
};

/**
 * Audit Logging Extension
 *
 * Logs database operations for compliance and security monitoring
 */
export function createAuditExtension(
  prisma: PrismaClient, // <-- now required
  config: Partial<AuditConfig> = {},
  context: AuditContext = {}
) {
  const finalConfig = { ...defaultAuditConfig, ...config };

  if (!finalConfig.enabled) {
    return null;
  }

  return Prisma.defineExtension({
    name: "Audit",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          if (finalConfig.excludeModels.includes(model)) {
            return query(args);
          }

          const startTime = Date.now();
          let result;
          let errorMessage: string | undefined;
          let success = true;
          try {
            result = await query(args);
            if (finalConfig.logWrites) {
              await prisma.auditLog.create({
                data: {
                  action: "CREATE",
                  resource: model,
                  resourceId: getResourceKey(result) ?? null,
                  userId: context.userId ?? null,
                  metadata: JSON.parse(JSON.stringify(args.data ?? {})),
                  createdAt: new Date(),
                },
              });
            }
            // Optionally: Write to compliance_audit_logs for compliance events
            // ...
            console.log(`AUDIT: Created ${model}`, {
              operation: "CREATE",
              model,
              userId: context.userId,
              timestamp: new Date(),
              duration: Date.now() - startTime,
              success: true,
            });
            return result;
          } catch (error) {
            success = false;
            errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.log(`AUDIT: Failed to create ${model}`, {
              operation: "CREATE",
              model,
              userId: context.userId,
              timestamp: new Date(),
              duration: Date.now() - startTime,
              success: false,
              error: errorMessage,
            });
            throw error;
          }
        },
        async update({ model, args, query }) {
          if (finalConfig.excludeModels.includes(model)) {
            return query(args);
          }
          const startTime = Date.now();
          let before: any = null;
          let after: any = null;
          let result;
          let errorMessage: string | undefined;
          let success = true;
          try {
            // Fetch before value
            let whereKey = getResourceKey(args.where);
            if (args.where && whereKey) {
              const delegate = getPrismaDelegate(prisma, model);
              if (delegate) {
                before = await delegate.findUnique({
                  where: args.where,
                });
              }
            }
            result = await query(args);
            after = result;
            if (finalConfig.logWrites) {
              await prisma.auditLog.create({
                data: {
                  action: "UPDATE",
                  resource: model,
                  resourceId: getResourceKey(result) ?? whereKey ?? null,
                  userId: context.userId ?? null,
                  metadata: JSON.parse(
                    JSON.stringify({
                      before,
                      after,
                      update: args.data ?? {},
                    })
                  ),
                  createdAt: new Date(),
                },
              });
            }
            // Optionally: Write to compliance_audit_logs for compliance events
            // ...
            console.log(`AUDIT: Updated ${model}`, {
              operation: "UPDATE",
              model,
              userId: context.userId,
              timestamp: new Date(),
              duration: Date.now() - startTime,
              success: true,
            });
            return result;
          } catch (error) {
            success = false;
            errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.log(`AUDIT: Failed to update ${model}`, {
              operation: "UPDATE",
              model,
              userId: context.userId,
              timestamp: new Date(),
              duration: Date.now() - startTime,
              success: false,
              error: errorMessage,
            });
            throw error;
          }
        },
        async delete({ model, args, query }) {
          if (finalConfig.excludeModels.includes(model)) {
            return query(args);
          }
          const startTime = Date.now();
          let before: any = null;
          let result;
          let errorMessage: string | undefined;
          let success = true;
          try {
            // Fetch before value
            let whereKey = getResourceKey(args.where);
            if (args.where && whereKey) {
              const delegate = getPrismaDelegate(prisma, model);
              if (delegate) {
                before = await delegate.findUnique({
                  where: args.where,
                });
              }
            }
            result = await query(args);
            if (finalConfig.logWrites) {
              await prisma.auditLog.create({
                data: {
                  action: "DELETE",
                  resource: model,
                  resourceId: getResourceKey(before) ?? whereKey ?? null,
                  userId: context.userId ?? null,
                  metadata: JSON.parse(
                    JSON.stringify({
                      before,
                    })
                  ),
                  createdAt: new Date(),
                },
              });
            }
            // Optionally: Write to compliance_audit_logs for compliance events
            // ...
            console.log(`AUDIT: Deleted ${model}`, {
              operation: "DELETE",
              model,
              userId: context.userId,
              timestamp: new Date(),
              duration: Date.now() - startTime,
              success: true,
            });
            return result;
          } catch (error) {
            success = false;
            errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.log(`AUDIT: Failed to delete ${model}`, {
              operation: "DELETE",
              model,
              userId: context.userId,
              timestamp: new Date(),
              duration: Date.now() - startTime,
              success: false,
              error: errorMessage,
            });
            throw error;
          }
        },
        // Optionally, add findMany/findFirst for read auditing if needed
      },
    },
  });
}

/**
 * Data sanitization for compliance
 */
function sanitizeData(data: any, model: string, config: AuditConfig): any {
  if (!config.sanitizeData || !data) {
    return data;
  }

  const sanitized = { ...data };

  // Remove sensitive fields
  config.excludeFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  });

  // Apply compliance-specific sanitization
  switch (config.complianceLevel) {
    case "gdpr":
      // GDPR requires special handling of personal data
      if (sanitized.email) sanitized.email = "[REDACTED]";
      if (sanitized.phone) sanitized.phone = "[REDACTED]";
      break;
    case "hipaa":
      // HIPAA requires protection of health information
      if (sanitized.healthData) sanitized.healthData = "[REDACTED]";
      break;
    case "sox":
      // SOX requires financial data protection
      if (sanitized.financialData) sanitized.financialData = "[REDACTED]";
      break;
  }

  return sanitized;
}

/**
 * Audit utilities
 */
export const createAuditUtils = () => {
  return {
    // Create compliance report
    generateComplianceReport: async (
      prisma: any,
      startDate: Date,
      endDate: Date
    ) => {
      const logs = await prisma.complianceAuditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          timestamp: "desc",
        },
      });

      const report = {
        period: { startDate, endDate },
        totalActions: logs.length,
        successfulActions: logs.filter((log: any) => log.success).length,
        failedActions: logs.filter((log: any) => !log.success).length,
        actionsByType: {} as Record<string, number>,
        actionsByModel: {} as Record<string, number>,
        userActivity: {} as Record<string, number>,
      };

      logs.forEach((log: any) => {
        // Count by operation type
        const operation = log.operation || "unknown";
        report.actionsByType[operation] =
          (report.actionsByType[operation] || 0) + 1;

        // Count by model
        const model = log.model || "unknown";
        report.actionsByModel[model] = (report.actionsByModel[model] || 0) + 1;

        // Count by user
        const userId = log.userId || "anonymous";
        report.userActivity[userId] = (report.userActivity[userId] || 0) + 1;
      });

      return report;
    },

    // Clean old audit logs
    cleanOldAuditLogs: async (prisma: any, retentionDays: number) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deleted = await prisma.complianceAuditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`Cleaned ${deleted.count} old audit logs`);
      return deleted.count;
    },

    // Sanitize data for logging
    sanitizeData,

    // Check compliance requirements
    checkCompliance: (config: AuditConfig) => {
      const checks = {
        dataRetentionConfigured: config.retentionDays > 0,
        auditingEnabled: config.enabled,
        sensitiveDataProtected: config.sanitizeData,
        writeOperationsLogged: config.logWrites,
      };

      const isCompliant = Object.values(checks).every(Boolean);

      return {
        isCompliant,
        checks,
        recommendations: isCompliant
          ? []
          : [
              !checks.dataRetentionConfigured &&
                "Configure data retention policy",
              !checks.auditingEnabled && "Enable audit logging",
              !checks.sensitiveDataProtected && "Enable data sanitization",
              !checks.writeOperationsLogged && "Enable write operation logging",
            ].filter(Boolean),
      };
    },
  };
};

// Utility to extract a unique resource key as string
function getResourceKey(obj: any): string | null {
  if (!obj) return null;
  if (typeof obj.id === "string" || typeof obj.id === "number")
    return String(obj.id);
  // Compound key: join all values
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 1 && typeof obj[keys[0]] === "object") {
      // Nested compound key (e.g., { teamId_userId: { teamId, userId } })
      return Object.entries(obj[keys[0]])
        .map(([k, v]) => `${k}:${v}`)
        .join("|");
    }
    return keys.map((k) => `${k}:${obj[k]}`).join("|");
  }
  return null;
}

// Helper to get the correct Prisma delegate for a model name
function getPrismaDelegate(prisma: PrismaClient, model: string) {
  const mapping: Record<string, any> = {
    user: prisma.user,
    userwallet: prisma.userWallet,
    blockchaintransaction: prisma.blockchainTransaction,
    notification: prisma.notification,
    notificationpreference: prisma.notificationPreference,
    team: prisma.team,
    teammember: prisma.teamMember,
    auditlog: prisma.auditLog,
    complianceauditlog: prisma.complianceAuditLog,
    workflowstatesnapshot: prisma.workflowStateSnapshot,
    // Add other models as needed
  };
  return mapping[model.toLowerCase()];
}
