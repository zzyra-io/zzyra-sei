import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from '../../services/database.service';

import { ProtocolService } from '../../services/protocol.service';
import { BlockType, BlockExecutionContext, BlockHandler } from '@zyra/types';

// Define the configuration schema for protocol monitoring
const ProtocolMonitorConfigSchema = z.object({
  protocol: z.string().min(1, 'Protocol name is required'),
  metrics: z.array(z.string()).min(1, 'At least one metric must be specified'),
  thresholds: z
    .record(
      z.string(),
      z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        alert: z.boolean().optional().default(true),
      }),
    )
    .optional(),
  monitoringInterval: z.number().min(1).default(60), // in minutes
});

type ProtocolMonitorConfig = z.infer<typeof ProtocolMonitorConfigSchema>;

/**
 * Handler for monitoring DeFi protocol metrics
 */
@Injectable()
export class ProtocolMonitorHandler implements BlockHandler {
  private readonly logger = new Logger(ProtocolMonitorHandler.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly protocolService: ProtocolService,
  ) {}

  // Execution tracking methods
  public async startExecution(
    nodeId: string,
    executionId: string,
    blockType: string,
  ): Promise<string> {
    try {
      const blockExecution =
        await this.databaseService.prisma.blockExecution.create({
          data: {
            nodeId,
            executionId,
            blockType,
            status: 'running',
            startTime: new Date(),
          },
        });

      return blockExecution.id;
    } catch (error: any) {
      this.logger.error(
        `Failed to start execution tracking: ${error?.message || 'Unknown error'}`,
      );
      return '';
    }
  }

  public async completeExecution(
    blockExecutionId: string,
    status: 'completed' | 'failed',
    result?: any,
    error?: any,
  ): Promise<void> {
    if (!blockExecutionId) return;

    try {
      await this.databaseService.prisma.blockExecution.update({
        where: { id: blockExecutionId },
        data: {
          status,
          endTime: new Date(),
          output: result ? JSON.stringify(result) : null,
          error: error
            ? typeof error === 'string'
              ? error
              : JSON.stringify(error)
            : null,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to complete execution tracking: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  public async trackLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
  ): Promise<void> {
    try {
      await this.databaseService.executions.addLog(
        executionId,
        level,
        message,
        {
          nodeId,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to track log: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    const blockType = BlockType.DEFI_PROTOCOL;
    const inputs = ctx.workflowData || {};
    const config = node.data?.config || {};
    this.logger.log(`Executing ProtocolMonitor block: ${nodeId}`);

    // Track execution
    const blockExecutionId = await this.startExecution(
      nodeId,
      executionId,
      blockType,
    );

    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(config);

      // Log the start of protocol monitoring
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Monitoring protocol ${validatedConfig.protocol} for metrics: ${validatedConfig.metrics.join(', ')}`,
      );

      // Fetch protocol metrics
      const protocolMetrics = await this.fetchProtocolMetrics(
        validatedConfig.protocol,
        validatedConfig.metrics,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Fetched metrics for ${validatedConfig.protocol}: ${JSON.stringify(protocolMetrics)}`,
      );

      // Check thresholds and identify alerts
      const alerts = this.checkThresholds(
        protocolMetrics,
        validatedConfig.thresholds,
      );

      if (alerts.length > 0) {
        await this.trackLog(
          executionId,
          nodeId,
          'warn',
          `Found ${alerts.length} alerts: ${JSON.stringify(alerts)}`,
        );
      } else {
        await this.trackLog(
          executionId,
          nodeId,
          'info',
          'No alerts detected, all metrics within thresholds',
        );
      }

      // Complete execution
      const result = {
        protocol: validatedConfig.protocol,
        metrics: protocolMetrics,
        alerts,
        timestamp: new Date().toISOString(),
      };

      await this.completeExecution(blockExecutionId, 'completed', result);

      return result;
    } catch (error: any) {
      // Log error
      await this.trackLog(
        executionId,
        nodeId,
        'error',
        `Protocol monitoring failed: ${error?.message || 'Unknown error'}`,
      );

      // Complete execution with error
      await this.completeExecution(blockExecutionId, 'failed', null, error);

      throw error;
    }
  }

  /**
   * Validates the configuration for the protocol monitor block
   */
  private validateConfig(config: Record<string, any>): ProtocolMonitorConfig {
    try {
      return ProtocolMonitorConfigSchema.parse(config);
    } catch (error: any) {
      throw new Error(
        `Invalid protocol monitor configuration: ${error?.message || 'Unknown validation error'}`,
      );
    }
  }

  /**
   * Fetches metrics for the specified protocol
   */
  private async fetchProtocolMetrics(
    protocol: string,
    metrics: string[],
  ): Promise<Record<string, number>> {
    try {
      const protocolData = await this.protocolService.getProtocolMetrics(
        protocol,
        metrics,
      );

      // Validate that all requested metrics were returned
      const missingMetrics = metrics.filter(
        (metric) => !(metric in protocolData),
      );
      if (missingMetrics.length > 0) {
        this.logger.warn(
          `Missing metrics for ${protocol}: ${missingMetrics.join(', ')}`,
        );
      }

      return protocolData;
    } catch (error: any) {
      throw new Error(
        `Failed to fetch protocol metrics: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Checks if metrics exceed specified thresholds
   */
  private checkThresholds(
    metrics: Record<string, number>,
    thresholds?: Record<
      string,
      { min?: number; max?: number; alert?: boolean }
    >,
  ): Array<{
    metric: string;
    value: number;
    threshold: string;
    condition: string;
  }> {
    if (!thresholds) {
      return [];
    }

    const alerts: Array<{
      metric: string;
      value: number;
      threshold: string;
      condition: string;
    }> = [];

    Object.entries(metrics).forEach(([metric, value]) => {
      const threshold = thresholds[metric];
      if (!threshold) {
        return;
      }

      if (
        threshold.min !== undefined &&
        value < threshold.min &&
        threshold.alert !== false
      ) {
        alerts.push({
          metric,
          value,
          threshold: threshold.min.toString(),
          condition: 'below_minimum',
        });
      }

      if (
        threshold.max !== undefined &&
        value > threshold.max &&
        threshold.alert !== false
      ) {
        alerts.push({
          metric,
          value,
          threshold: threshold.max.toString(),
          condition: 'above_maximum',
        });
      }
    });

    return alerts;
  }
}
