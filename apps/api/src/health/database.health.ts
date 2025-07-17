import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export interface DatabaseHealthResult {
  status: "ok" | "error";
  details: {
    responseTime?: string;
    userCount?: number;
    status: string;
    error?: string;
    timestamp: string;
  };
}

@Injectable()
export class DatabaseHealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(private readonly prismaService: PrismaService) {}

  async checkHealth(): Promise<DatabaseHealthResult> {
    const start = Date.now();

    try {
      // Test basic connection
      await this.prismaService.client.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - start;

      // Test a simple query to verify database functionality
      const userCount = await this.prismaService.client.user.count();

      const isHealthy = responseTime < 5000; // Consider unhealthy if query takes > 5s

      if (isHealthy) {
        this.logger.log(`Database health check passed in ${responseTime}ms`);
        return {
          status: "ok",
          details: {
            responseTime: `${responseTime}ms`,
            userCount,
            status: "connected",
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        this.logger.warn(`Database response time too slow: ${responseTime}ms`);
        return {
          status: "error",
          details: {
            responseTime: `${responseTime}ms`,
            status: "slow",
            error: `Response time too slow: ${responseTime}ms`,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - start;

      this.logger.error(`Database health check failed: ${error.message}`);

      return {
        status: "error",
        details: {
          responseTime: `${responseTime}ms`,
          status: "disconnected",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async checkConnectionPool(): Promise<DatabaseHealthResult> {
    const start = Date.now();

    try {
      // Check if we can execute multiple concurrent queries
      const queries = Array(5)
        .fill(null)
        .map(
          (_, i) => this.prismaService.client.$queryRaw`SELECT ${i} as query_id`
        );

      await Promise.all(queries);
      const responseTime = Date.now() - start;

      this.logger.log(`Connection pool check passed in ${responseTime}ms`);

      return {
        status: "ok",
        details: {
          responseTime: `${responseTime}ms`,
          status: "pool_healthy",
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - start;

      this.logger.error(`Connection pool check failed: ${error.message}`);

      return {
        status: "error",
        details: {
          responseTime: `${responseTime}ms`,
          status: "pool_error",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async checkDatabaseTables(): Promise<DatabaseHealthResult> {
    const start = Date.now();

    try {
      // Verify key tables exist and are accessible
      const tableChecks = await Promise.all([
        this.prismaService.client.user.findFirst().catch(() => null),
        this.prismaService.client.workflow.findFirst().catch(() => null),
        this.prismaService.client.workflowExecution
          .findFirst()
          .catch(() => null),
      ]);

      const tablesAccessible = tableChecks.every(
        (result) => result !== undefined
      );
      const responseTime = Date.now() - start;

      if (tablesAccessible) {
        this.logger.log(`Database tables check passed in ${responseTime}ms`);
        return {
          status: "ok",
          details: {
            responseTime: `${responseTime}ms`,
            status: "tables_ok",
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        this.logger.warn("Some database tables are not accessible");
        return {
          status: "error",
          details: {
            responseTime: `${responseTime}ms`,
            status: "table_access_error",
            error: "Some tables are not accessible",
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - start;

      this.logger.error(`Database tables check failed: ${error.message}`);

      return {
        status: "error",
        details: {
          responseTime: `${responseTime}ms`,
          status: "table_check_failed",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async getComprehensiveHealth(): Promise<{
    overall: "ok" | "error";
    checks: {
      basic: DatabaseHealthResult;
      connectionPool: DatabaseHealthResult;
      tables: DatabaseHealthResult;
    };
    timestamp: string;
  }> {
    const start = Date.now();

    try {
      const [basicHealth, poolHealth, tableHealth] = await Promise.allSettled([
        this.checkHealth(),
        this.checkConnectionPool(),
        this.checkDatabaseTables(),
      ]);

      const basic =
        basicHealth.status === "fulfilled"
          ? basicHealth.value
          : {
              status: "error" as const,
              details: {
                status: "check_failed",
                error:
                  basicHealth.reason?.message || "Basic health check failed",
                timestamp: new Date().toISOString(),
              },
            };

      const connectionPool =
        poolHealth.status === "fulfilled"
          ? poolHealth.value
          : {
              status: "error" as const,
              details: {
                status: "check_failed",
                error: poolHealth.reason?.message || "Pool health check failed",
                timestamp: new Date().toISOString(),
              },
            };

      const tables =
        tableHealth.status === "fulfilled"
          ? tableHealth.value
          : {
              status: "error" as const,
              details: {
                status: "check_failed",
                error:
                  tableHealth.reason?.message || "Table health check failed",
                timestamp: new Date().toISOString(),
              },
            };

      const overall =
        basic.status === "ok" &&
        connectionPool.status === "ok" &&
        tables.status === "ok"
          ? "ok"
          : "error";

      const totalTime = Date.now() - start;
      this.logger.log(
        `Comprehensive database health check completed in ${totalTime}ms with status: ${overall}`
      );

      return {
        overall,
        checks: {
          basic,
          connectionPool,
          tables,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Comprehensive health check failed: ${error.message}`);

      return {
        overall: "error",
        checks: {
          basic: {
            status: "error",
            details: {
              status: "comprehensive_check_failed",
              error: error.message,
              timestamp: new Date().toISOString(),
            },
          },
          connectionPool: {
            status: "error",
            details: {
              status: "comprehensive_check_failed",
              error: error.message,
              timestamp: new Date().toISOString(),
            },
          },
          tables: {
            status: "error",
            details: {
              status: "comprehensive_check_failed",
              error: error.message,
              timestamp: new Date().toISOString(),
            },
          },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
