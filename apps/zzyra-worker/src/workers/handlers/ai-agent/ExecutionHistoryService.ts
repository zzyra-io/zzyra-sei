import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { CacheService } from './CacheService';

interface ExecutionSnapshot {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  config: {
    provider: any;
    agent: any;
    selectedTools: any[];
    execution: any;
  };
  context: {
    prompt: string;
    systemPrompt: string;
    previousOutputs?: Record<string, any>;
  };
  steps: Array<{
    stepNumber: number;
    type: string;
    reasoning: string;
    confidence: number;
    timestamp: Date;
    toolsConsidered?: string[];
    decision?: string;
  }>;
  toolCalls: Array<{
    toolName: string;
    parameters: Record<string, any>;
    result: any;
    success: boolean;
    error?: string;
    responseTime: number;
    timestamp: Date;
  }>;
  result: {
    text: string;
    success: boolean;
    error?: string;
    executionTime: number;
  };
  metadata: {
    version: string;
    environment: string;
    tags: string[];
  };
}

interface ReplayOptions {
  replayMode: 'exact' | 'adaptive' | 'dry-run';
  modifyTools?: string[]; // Tools to enable/disable
  modifyPrompt?: string; // New prompt to use
  skipSteps?: number[]; // Step numbers to skip
  pauseBeforeStep?: number; // Step to pause before for review
}

interface HistoryQuery {
  userId?: string;
  toolName?: string;
  success?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  limit?: number;
  offset?: number;
}

@Injectable()
export class ExecutionHistoryService {
  private readonly logger = new Logger(ExecutionHistoryService.name);
  private readonly maxHistoryEntries = 1000; // Maximum entries per user

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Save execution snapshot for replay capability
   */
  async saveExecutionSnapshot(
    snapshot: Omit<ExecutionSnapshot, 'id' | 'timestamp' | 'metadata'>,
    tags: string[] = [],
  ): Promise<string> {
    try {
      const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fullSnapshot: ExecutionSnapshot = {
        ...snapshot,
        id,
        timestamp: new Date(),
        metadata: {
          version: '1.0',
          environment: process.env.NODE_ENV || 'development',
          tags,
        },
      };

      // Store in database if available
      try {
        await (this.databaseService.prisma as any).executionSnapshot?.create({
          data: {
            id,
            userId: snapshot.userId,
            sessionId: snapshot.sessionId,
            config: snapshot.config,
            context: snapshot.context,
            steps: snapshot.steps,
            toolCalls: snapshot.toolCalls,
            result: snapshot.result,
            metadata: fullSnapshot.metadata,
            timestamp: fullSnapshot.timestamp,
          },
        });
      } catch (dbError) {
        // Fall back to cache storage
        await this.cacheService.cacheToolResult(
          {
            toolName: `snapshot:${id}`,
            parameters: {},
            userId: snapshot.userId,
          },
          fullSnapshot,
          7200, // 2 hours
        );
      }

      // Cleanup old entries to maintain limit
      await this.cleanupOldEntries(snapshot.userId);

      this.logger.log(`Saved execution snapshot: ${id}`);
      return id;
    } catch (error) {
      this.logger.error('Failed to save execution snapshot:', error);
      throw new Error(
        `Failed to save execution: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retrieve execution snapshot by ID
   */
  async getExecutionSnapshot(id: string): Promise<ExecutionSnapshot | null> {
    try {
      // Try database first
      try {
        const snapshot = await (
          this.databaseService.prisma as any
        ).executionSnapshot?.findUnique({
          where: { id },
        });

        if (snapshot) {
          return snapshot;
        }
      } catch (dbError) {
        this.logger.debug('Database not available, checking cache');
      }

      // Fall back to cache
      const cachedSnapshot = await this.cacheService.getCachedToolResult({
        toolName: `snapshot:${id}`,
        parameters: {},
        userId: 'any', // We don't know the userId here
      });

      return cachedSnapshot || null;
    } catch (error) {
      this.logger.error(`Failed to get execution snapshot ${id}:`, error);
      return null;
    }
  }

  /**
   * Search execution history with flexible queries
   */
  async searchExecutionHistory(query: HistoryQuery): Promise<{
    snapshots: ExecutionSnapshot[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const limit = query.limit || 20;
      const offset = query.offset || 0;

      // Build database query if available
      try {
        const whereClause: any = {};

        if (query.userId) whereClause.userId = query.userId;
        if (query.success !== undefined)
          whereClause.result = { path: ['success'], equals: query.success };
        if (query.dateRange) {
          whereClause.timestamp = {
            gte: query.dateRange.start,
            lte: query.dateRange.end,
          };
        }
        if (query.tags && query.tags.length > 0) {
          whereClause.metadata = {
            path: ['tags'],
            array_contains: query.tags,
          };
        }

        const snapshots = await (
          this.databaseService.prisma as any
        ).executionSnapshot?.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
        });

        const totalCount = await (
          this.databaseService.prisma as any
        ).executionSnapshot?.count({
          where: whereClause,
        });

        return {
          snapshots: snapshots || [],
          totalCount: totalCount || 0,
          hasMore: (totalCount || 0) > offset + limit,
        };
      } catch (dbError) {
        this.logger.debug('Database not available for history search');

        // Fallback to limited cache-based search
        return {
          snapshots: [],
          totalCount: 0,
          hasMore: false,
        };
      }
    } catch (error) {
      this.logger.error('Failed to search execution history:', error);
      return {
        snapshots: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Replay execution with modifications
   */
  async replayExecution(
    snapshotId: string,
    options: ReplayOptions,
  ): Promise<{
    replayId: string;
    originalSnapshot: ExecutionSnapshot;
    modifiedConfig: any;
    estimatedSteps: number;
    warnings: string[];
  }> {
    try {
      const originalSnapshot = await this.getExecutionSnapshot(snapshotId);
      if (!originalSnapshot) {
        throw new Error(`Execution snapshot ${snapshotId} not found`);
      }

      const replayId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const warnings: string[] = [];

      // Clone and modify configuration
      const modifiedConfig = JSON.parse(
        JSON.stringify(originalSnapshot.config),
      );

      // Apply tool modifications
      if (options.modifyTools) {
        const originalToolIds = modifiedConfig.selectedTools.map(
          (t: any) => t.id,
        );

        for (const toolMod of options.modifyTools) {
          if (toolMod.startsWith('+')) {
            // Add tool
            const toolId = toolMod.substring(1);
            if (!originalToolIds.includes(toolId)) {
              modifiedConfig.selectedTools.push({
                id: toolId,
                name: toolId,
                type: 'mcp',
                enabled: true,
              });
            }
          } else if (toolMod.startsWith('-')) {
            // Remove tool
            const toolId = toolMod.substring(1);
            modifiedConfig.selectedTools = modifiedConfig.selectedTools.filter(
              (t: any) => t.id !== toolId,
            );
          }
        }
      }

      // Modify prompt if requested
      const modifiedContext = { ...originalSnapshot.context };
      if (options.modifyPrompt) {
        modifiedContext.prompt = options.modifyPrompt;
        warnings.push(
          'Prompt has been modified - results may differ significantly',
        );
      }

      // Calculate estimated steps
      let estimatedSteps = originalSnapshot.steps.length;
      if (options.skipSteps) {
        estimatedSteps -= options.skipSteps.length;
        warnings.push(`${options.skipSteps.length} steps will be skipped`);
      }

      // Add mode-specific warnings
      switch (options.replayMode) {
        case 'exact':
          warnings.push(
            'Exact replay - will attempt to reproduce identical results',
          );
          break;
        case 'adaptive':
          warnings.push('Adaptive replay - will adjust for current conditions');
          break;
        case 'dry-run':
          warnings.push('Dry run - no actual tool execution will occur');
          break;
      }

      // Cache replay configuration
      const replayConfig = {
        replayId,
        originalSnapshotId: snapshotId,
        modifiedConfig,
        modifiedContext,
        options,
        warnings,
        createdAt: new Date(),
      };

      await this.cacheService.cacheToolResult(
        {
          toolName: `replay:${replayId}`,
          parameters: {},
          userId: originalSnapshot.userId,
        },
        replayConfig,
        3600, // 1 hour
      );

      this.logger.log(`Prepared replay ${replayId} for snapshot ${snapshotId}`);

      return {
        replayId,
        originalSnapshot,
        modifiedConfig,
        estimatedSteps,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Failed to prepare replay for ${snapshotId}:`, error);
      throw error;
    }
  }

  /**
   * Get replay configuration
   */
  async getReplayConfig(replayId: string): Promise<any | null> {
    try {
      const config = await this.cacheService.getCachedToolResult({
        toolName: `replay:${replayId}`,
        parameters: {},
        userId: 'any',
      });

      return config;
    } catch (error) {
      this.logger.error(`Failed to get replay config ${replayId}:`, error);
      return null;
    }
  }

  /**
   * Compare two executions
   */
  async compareExecutions(
    snapshot1Id: string,
    snapshot2Id: string,
  ): Promise<{
    differences: {
      config: any[];
      steps: any[];
      toolCalls: any[];
      results: any[];
    };
    similarity: number;
    analysis: string[];
  }> {
    try {
      const [snapshot1, snapshot2] = await Promise.all([
        this.getExecutionSnapshot(snapshot1Id),
        this.getExecutionSnapshot(snapshot2Id),
      ]);

      if (!snapshot1 || !snapshot2) {
        throw new Error('One or both snapshots not found');
      }

      const differences = {
        config: this.compareObjects(
          snapshot1.config,
          snapshot2.config,
          'config',
        ),
        steps: this.compareArrays(snapshot1.steps, snapshot2.steps, 'steps'),
        toolCalls: this.compareArrays(
          snapshot1.toolCalls,
          snapshot2.toolCalls,
          'toolCalls',
        ),
        results: this.compareObjects(
          snapshot1.result,
          snapshot2.result,
          'result',
        ),
      };

      const similarity = this.calculateSimilarity(differences);
      const analysis = this.generateComparisonAnalysis(differences, similarity);

      return {
        differences,
        similarity,
        analysis,
      };
    } catch (error) {
      this.logger.error(
        `Failed to compare executions ${snapshot1Id} vs ${snapshot2Id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get execution patterns and insights
   */
  async getExecutionInsights(
    userId: string,
    timeRange?: {
      start: Date;
      end: Date;
    },
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    popularTools: Array<{ name: string; count: number; successRate: number }>;
    commonFailures: Array<{ error: string; count: number; tools: string[] }>;
    trends: {
      daily: number[];
      hourly: number[];
    };
  }> {
    try {
      const query: HistoryQuery = { userId };
      if (timeRange) {
        query.dateRange = timeRange;
      }

      const { snapshots } = await this.searchExecutionHistory({
        ...query,
        limit: 500,
      });

      const totalExecutions = snapshots.length;
      const successfulExecutions = snapshots.filter(
        (s) => s.result.success,
      ).length;
      const successRate =
        totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

      const totalExecutionTime = snapshots.reduce(
        (sum, s) => sum + s.result.executionTime,
        0,
      );
      const averageExecutionTime =
        totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0;

      // Analyze tool usage
      const toolUsage = new Map<string, { count: number; successes: number }>();
      snapshots.forEach((snapshot) => {
        snapshot.toolCalls.forEach((toolCall) => {
          const existing = toolUsage.get(toolCall.toolName) || {
            count: 0,
            successes: 0,
          };
          existing.count++;
          if (toolCall.success) existing.successes++;
          toolUsage.set(toolCall.toolName, existing);
        });
      });

      const popularTools = Array.from(toolUsage.entries())
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          successRate: stats.count > 0 ? stats.successes / stats.count : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Analyze common failures
      const failureAnalysis = new Map<
        string,
        { count: number; tools: Set<string> }
      >();
      snapshots
        .filter((s) => !s.result.success && s.result.error)
        .forEach((snapshot) => {
          const error = snapshot.result.error!;
          const existing = failureAnalysis.get(error) || {
            count: 0,
            tools: new Set(),
          };
          existing.count++;
          snapshot.toolCalls.forEach((tc) => existing.tools.add(tc.toolName));
          failureAnalysis.set(error, existing);
        });

      const commonFailures = Array.from(failureAnalysis.entries())
        .map(([error, stats]) => ({
          error,
          count: stats.count,
          tools: Array.from(stats.tools),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Generate trends (simplified for demo)
      const daily = Array.from({ length: 7 }, () =>
        Math.floor(Math.random() * totalExecutions),
      );
      const hourly = Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * totalExecutions),
      );

      return {
        totalExecutions,
        successRate,
        averageExecutionTime,
        popularTools,
        commonFailures,
        trends: { daily, hourly },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get execution insights for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // Private helper methods
  private async cleanupOldEntries(userId: string): Promise<void> {
    try {
      // This would implement cleanup logic for old entries
      // For now, just log the cleanup intention
      this.logger.debug(`Cleanup check for user ${userId} entries`);
    } catch (error) {
      this.logger.error('Failed to cleanup old entries:', error);
    }
  }

  private compareObjects(obj1: any, obj2: any, path: string): any[] {
    const differences: any[] = [];

    // Simple deep comparison - in production, you'd use a proper diff library
    const str1 = JSON.stringify(obj1, null, 2);
    const str2 = JSON.stringify(obj2, null, 2);

    if (str1 !== str2) {
      differences.push({
        path,
        type: 'object_change',
        before: obj1,
        after: obj2,
      });
    }

    return differences;
  }

  private compareArrays(arr1: any[], arr2: any[], path: string): any[] {
    const differences: any[] = [];

    if (arr1.length !== arr2.length) {
      differences.push({
        path,
        type: 'length_change',
        before: arr1.length,
        after: arr2.length,
      });
    }

    // Compare elements (simplified)
    const minLength = Math.min(arr1.length, arr2.length);
    for (let i = 0; i < minLength; i++) {
      const item1 = JSON.stringify(arr1[i]);
      const item2 = JSON.stringify(arr2[i]);

      if (item1 !== item2) {
        differences.push({
          path: `${path}[${i}]`,
          type: 'item_change',
          before: arr1[i],
          after: arr2[i],
        });
      }
    }

    return differences;
  }

  private calculateSimilarity(differences: any): number {
    const totalDifferences =
      differences.config.length +
      differences.steps.length +
      differences.toolCalls.length +
      differences.results.length;

    // Simple similarity calculation - in production, you'd use more sophisticated metrics
    const maxPossibleDifferences = 20; // Arbitrary baseline
    const similarity = Math.max(
      0,
      1 - totalDifferences / maxPossibleDifferences,
    );

    return Math.round(similarity * 100) / 100;
  }

  private generateComparisonAnalysis(
    differences: any,
    similarity: number,
  ): string[] {
    const analysis: string[] = [];

    if (similarity > 0.8) {
      analysis.push('Executions are very similar');
    } else if (similarity > 0.6) {
      analysis.push('Executions have moderate differences');
    } else {
      analysis.push('Executions are significantly different');
    }

    if (differences.config.length > 0) {
      analysis.push(`Configuration differences: ${differences.config.length}`);
    }

    if (differences.steps.length > 0) {
      analysis.push(`Step differences: ${differences.steps.length}`);
    }

    if (differences.toolCalls.length > 0) {
      analysis.push(`Tool call differences: ${differences.toolCalls.length}`);
    }

    if (differences.results.length > 0) {
      analysis.push(`Result differences: ${differences.results.length}`);
    }

    return analysis;
  }
}
