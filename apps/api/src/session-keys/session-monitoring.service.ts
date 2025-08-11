import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../database/prisma.service";
import {
  SessionKeyStatus,
  SessionEventType,
  AnomalyAlert,
  SessionKeyData,
} from "@zzyra/types";

/**
 * Service for monitoring session keys and detecting security anomalies
 * Following NestJS guidelines and security best practices
 */
@Injectable()
export class SessionMonitoringService {
  private readonly logger = new Logger(SessionMonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every 5 minutes to monitor active sessions
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorActiveSessions(): Promise<void> {
    try {
      this.logger.debug("Starting session monitoring sweep");

      // Get all active sessions
      const activeSessions = await this.prisma.client.sessionKey.findMany({
        where: {
          status: SessionKeyStatus.ACTIVE,
        },
        include: {
          permissions: true,
          transactions: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      this.logger.debug(`Monitoring ${activeSessions.length} active sessions`);

      for (const session of activeSessions) {
        await this.monitorSession(session);
      }

      this.logger.debug("Session monitoring sweep completed");
    } catch (error) {
      this.logger.error("Failed to monitor sessions", error);
    }
  }

  /**
   * Monitor individual session for anomalies
   */
  private async monitorSession(session: any): Promise<void> {
    try {
      // Check if session is expired
      if (new Date() > session.validUntil) {
        await this.expireSession(session.id, "Automatic expiration");
        return;
      }

      // Check for spending anomalies
      await this.checkSpendingAnomalies(session);

      // Check for velocity anomalies
      await this.checkVelocityAnomalies(session);

      // Check for unusual patterns
      await this.checkPatternAnomalies(session);

      // Reset daily usage if needed
      await this.resetDailyUsageIfNeeded(session);
    } catch (error) {
      this.logger.error(`Failed to monitor session ${session.id}`, error);
    }
  }

  /**
   * Check for spending anomalies
   */
  private async checkSpendingAnomalies(session: any): Promise<void> {
    const dailyTransactions = session.transactions.filter(
      (tx: any) => tx.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (dailyTransactions.length === 0) return;

    const dailySpending = dailyTransactions.reduce(
      (sum: number, tx: any) => sum + parseFloat(tx.amount.toString()),
      0
    );

    // Check against daily limits
    const maxDailyAmount = Math.max(
      ...session.permissions.map((p: any) =>
        parseFloat(p.maxDailyAmount.toString())
      )
    );

    const usagePercentage = (dailySpending / maxDailyAmount) * 100;

    // Alert at 80% and 95% usage
    if (usagePercentage >= 95) {
      await this.createAnomalyAlert({
        sessionKeyId: session.id,
        alertType: "amount",
        severity: "critical",
        description: `Daily spending limit nearly exceeded: ${usagePercentage.toFixed(1)}%`,
        metadata: {
          dailySpending,
          maxDailyAmount,
          usagePercentage,
          transactionCount: dailyTransactions.length,
        },
        triggeredAt: new Date(),
      });

      // Pause session if at 100%
      if (usagePercentage >= 100) {
        await this.pauseSession(session.id, "Daily spending limit exceeded");
      }
    } else if (usagePercentage >= 80) {
      await this.createAnomalyAlert({
        sessionKeyId: session.id,
        alertType: "amount",
        severity: "high",
        description: `Daily spending limit warning: ${usagePercentage.toFixed(1)}%`,
        metadata: {
          dailySpending,
          maxDailyAmount,
          usagePercentage,
        },
        triggeredAt: new Date(),
      });
    }
  }

  /**
   * Check for velocity anomalies (too many transactions too quickly)
   */
  private async checkVelocityAnomalies(session: any): Promise<void> {
    const recentTransactions = session.transactions.filter(
      (tx: any) => tx.createdAt > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    // Alert if more than 10 transactions in 5 minutes
    if (recentTransactions.length > 10) {
      await this.createAnomalyAlert({
        sessionKeyId: session.id,
        alertType: "velocity",
        severity: "high",
        description: `High transaction velocity: ${recentTransactions.length} transactions in 5 minutes`,
        metadata: {
          transactionCount: recentTransactions.length,
          timeWindow: "5 minutes",
        },
        triggeredAt: new Date(),
      });

      // Temporarily pause session
      await this.pauseSession(
        session.id,
        "High transaction velocity detected",
        10
      ); // 10 minute pause
    }

    // Check hourly velocity
    const hourlyTransactions = session.transactions.filter(
      (tx: any) => tx.createdAt > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    if (hourlyTransactions.length > 100) {
      await this.createAnomalyAlert({
        sessionKeyId: session.id,
        alertType: "velocity",
        severity: "critical",
        description: `Extremely high transaction velocity: ${hourlyTransactions.length} transactions in 1 hour`,
        metadata: {
          transactionCount: hourlyTransactions.length,
          timeWindow: "1 hour",
        },
        triggeredAt: new Date(),
      });

      await this.pauseSession(
        session.id,
        "Extremely high transaction velocity",
        60
      ); // 1 hour pause
    }
  }

  /**
   * Check for unusual patterns
   */
  private async checkPatternAnomalies(session: any): Promise<void> {
    if (session.transactions.length < 5) return; // Need minimum data

    // Check for repeated identical transactions
    const transactionPatterns = new Map<string, number>();

    session.transactions.forEach((tx: any) => {
      const pattern = `${tx.toAddress}-${tx.amount}`;
      transactionPatterns.set(
        pattern,
        (transactionPatterns.get(pattern) || 0) + 1
      );
    });

    // Alert if same transaction repeated more than 10 times
    for (const [pattern, count] of transactionPatterns.entries()) {
      if (count > 10) {
        const [toAddress, amount] = pattern.split("-");
        await this.createAnomalyAlert({
          sessionKeyId: session.id,
          alertType: "pattern",
          severity: "medium",
          description: `Repeated transaction pattern detected: ${count} identical transactions`,
          metadata: {
            pattern: { toAddress, amount },
            count,
          },
          triggeredAt: new Date(),
        });
      }
    }

    // Check for round-number amounts (potential bot behavior)
    const roundAmounts = session.transactions.filter((tx: any) => {
      const amount = parseFloat(tx.amount.toString());
      return amount === Math.floor(amount) && amount > 0;
    });

    if (roundAmounts.length > session.transactions.length * 0.8) {
      await this.createAnomalyAlert({
        sessionKeyId: session.id,
        alertType: "pattern",
        severity: "low",
        description: `High percentage of round-number transactions: ${((roundAmounts.length / session.transactions.length) * 100).toFixed(1)}%`,
        metadata: {
          roundAmountCount: roundAmounts.length,
          totalTransactions: session.transactions.length,
          percentage: (roundAmounts.length / session.transactions.length) * 100,
        },
        triggeredAt: new Date(),
      });
    }
  }

  /**
   * Reset daily usage if 24 hours have passed
   */
  private async resetDailyUsageIfNeeded(session: any): Promise<void> {
    const now = new Date();
    const daysSinceReset = Math.floor(
      (now.getTime() - session.dailyResetAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSinceReset >= 1) {
      await this.prisma.client.sessionKey.update({
        where: { id: session.id },
        data: {
          dailyUsedAmount: 0,
          dailyResetAt: now,
        },
      });

      await this.logSessionEvent(session.id, {
        eventType: SessionEventType.USED,
        eventData: {
          action: "daily_usage_reset",
          previousAmount: session.dailyUsedAmount.toString(),
          resetAt: now.toISOString(),
        },
        severity: "info",
      });

      this.logger.debug(`Reset daily usage for session ${session.id}`);
    }
  }

  /**
   * Expire a session
   */
  private async expireSession(
    sessionKeyId: string,
    reason: string
  ): Promise<void> {
    await this.prisma.client.sessionKey.update({
      where: { id: sessionKeyId },
      data: {
        status: SessionKeyStatus.EXPIRED,
      },
    });

    await this.logSessionEvent(sessionKeyId, {
      eventType: SessionEventType.EXPIRED,
      eventData: {
        reason,
        expiredAt: new Date().toISOString(),
      },
      severity: "info",
    });

    this.logger.log(`Session ${sessionKeyId} expired: ${reason}`);
  }

  /**
   * Pause a session temporarily
   */
  private async pauseSession(
    sessionKeyId: string,
    reason: string,
    durationMinutes?: number
  ): Promise<void> {
    await this.prisma.client.sessionKey.update({
      where: { id: sessionKeyId },
      data: {
        status: SessionKeyStatus.PAUSED,
      },
    });

    await this.logSessionEvent(sessionKeyId, {
      eventType: SessionEventType.SECURITY_ALERT,
      eventData: {
        action: "session_paused",
        reason,
        durationMinutes,
        pausedAt: new Date().toISOString(),
      },
      severity: "warning",
    });

    this.logger.warn(`Session ${sessionKeyId} paused: ${reason}`);

    // Schedule reactivation if duration specified
    if (durationMinutes) {
      setTimeout(
        async () => {
          try {
            await this.reactivateSession(sessionKeyId);
          } catch (error) {
            this.logger.error(
              `Failed to reactivate session ${sessionKeyId}`,
              error
            );
          }
        },
        durationMinutes * 60 * 1000
      );
    }
  }

  /**
   * Reactivate a paused session
   */
  private async reactivateSession(sessionKeyId: string): Promise<void> {
    // Check if session still exists and is paused
    const session = await this.prisma.client.sessionKey.findUnique({
      where: { id: sessionKeyId },
    });

    if (!session || session.status !== SessionKeyStatus.PAUSED) {
      return;
    }

    // Check if session is still valid (not expired)
    if (new Date() > session.validUntil) {
      await this.expireSession(sessionKeyId, "Expired during pause");
      return;
    }

    await this.prisma.client.sessionKey.update({
      where: { id: sessionKeyId },
      data: {
        status: SessionKeyStatus.ACTIVE,
      },
    });

    await this.logSessionEvent(sessionKeyId, {
      eventType: SessionEventType.USED,
      eventData: {
        action: "session_reactivated",
        reactivatedAt: new Date().toISOString(),
      },
      severity: "info",
    });

    this.logger.log(`Session ${sessionKeyId} reactivated after pause`);
  }

  /**
   * Create anomaly alert
   */
  private async createAnomalyAlert(alert: AnomalyAlert): Promise<void> {
    await this.logSessionEvent(alert.sessionKeyId, {
      eventType: SessionEventType.SECURITY_ALERT,
      eventData: {
        alertType: alert.alertType,
        severity: alert.severity,
        description: alert.description,
        metadata: alert.metadata,
      },
      severity:
        alert.severity === "critical"
          ? "critical"
          : alert.severity === "high"
            ? "error"
            : alert.severity === "medium"
              ? "warning"
              : "info",
    });

    this.logger.warn(`Security alert for session ${alert.sessionKeyId}`, {
      alertType: alert.alertType,
      severity: alert.severity,
      description: alert.description,
    });

    // TODO: Send notifications to user based on their preferences
    // This could integrate with the notification system
  }

  /**
   * Log session event
   */
  private async logSessionEvent(
    sessionKeyId: string,
    event: {
      eventType: SessionEventType;
      eventData: Record<string, unknown>;
      severity: "info" | "warning" | "error" | "critical";
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await this.prisma.client.sessionEvent.create({
        data: {
          sessionKeyId,
          eventType: event.eventType,
          eventData: event.eventData as any,
          severity: event.severity,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });
    } catch (error) {
      this.logger.error("Failed to log session event", error);
    }
  }

  /**
   * Get security metrics for monitoring dashboard
   */
  async getSecurityMetrics(): Promise<{
    activeSessions: number;
    alertsLast24h: number;
    pausedSessions: number;
    expiredSessions: number;
    topAlertTypes: Array<{ type: string; count: number }>;
  }> {
    try {
      const [activeSessions, pausedSessions, expiredSessions, recentAlerts] =
        await Promise.all([
          this.prisma.client.sessionKey.count({
            where: { status: SessionKeyStatus.ACTIVE },
          }),
          this.prisma.client.sessionKey.count({
            where: { status: SessionKeyStatus.PAUSED },
          }),
          this.prisma.client.sessionKey.count({
            where: { status: SessionKeyStatus.EXPIRED },
          }),
          this.prisma.client.sessionEvent.findMany({
            where: {
              eventType: SessionEventType.SECURITY_ALERT,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          }),
        ]);

      // Count alert types
      const alertTypeCounts = new Map<string, number>();
      recentAlerts.forEach((alert) => {
        const alertType = (alert.eventData as any)?.alertType || "unknown";
        alertTypeCounts.set(
          alertType,
          (alertTypeCounts.get(alertType) || 0) + 1
        );
      });

      const topAlertTypes = Array.from(alertTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        activeSessions,
        alertsLast24h: recentAlerts.length,
        pausedSessions,
        expiredSessions,
        topAlertTypes,
      };
    } catch (error) {
      this.logger.error("Failed to get security metrics", error);
      return {
        activeSessions: 0,
        alertsLast24h: 0,
        pausedSessions: 0,
        expiredSessions: 0,
        topAlertTypes: [],
      };
    }
  }

  /**
   * Manual cleanup of expired sessions (can be called via admin endpoint)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const expiredSessions = await this.prisma.client.sessionKey.findMany({
        where: {
          validUntil: {
            lt: new Date(),
          },
          status: SessionKeyStatus.ACTIVE,
        },
      });

      for (const session of expiredSessions) {
        await this.expireSession(session.id, "Manual cleanup - expired");
      }

      this.logger.log(
        `Manually cleaned up ${expiredSessions.length} expired sessions`
      );
      return expiredSessions.length;
    } catch (error) {
      this.logger.error("Failed to cleanup expired sessions", error);
      return 0;
    }
  }
}
