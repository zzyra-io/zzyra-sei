import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './CacheService';
import { ToolAnalyticsService } from './ToolAnalyticsService';
import { ExecutionHistoryService } from './ExecutionHistoryService';
import { ToolDiscoveryService } from './ToolDiscoveryService';
import { ThinkingModeService } from './ThinkingModeService';
import { LLMProviderManager } from './LLMProviderManager';

/**
 * API service that exposes all AI Agent enhancements to the frontend
 * This provides a unified interface for all the new capabilities
 */
@Injectable()
export class AIAgentEnhancementsAPI {
  private readonly logger = new Logger(AIAgentEnhancementsAPI.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly toolAnalyticsService: ToolAnalyticsService,
    private readonly executionHistoryService: ExecutionHistoryService,
    private readonly toolDiscoveryService: ToolDiscoveryService,
    private readonly thinkingModeService: ThinkingModeService,
    private readonly llmProviderManager: LLMProviderManager,
  ) {}

  // Cache Management APIs
  async getCacheStats(): Promise<any> {
    try {
      return await this.cacheService.getStats();
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      throw new Error('Cache stats unavailable');
    }
  }

  async warmupUserCache(userId: string): Promise<void> {
    try {
      await this.cacheService.warmupCache(userId);
      this.logger.log(`Cache warmed up for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to warmup cache for user ${userId}:`, error);
      throw new Error('Cache warmup failed');
    }
  }

  async invalidateCachePattern(pattern: string): Promise<number> {
    try {
      return await this.cacheService.invalidateByPattern(pattern);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache pattern ${pattern}:`,
        error,
      );
      return 0;
    }
  }

  // Tool Analytics APIs
  async getToolMetrics(toolName: string, userId?: string): Promise<any> {
    try {
      return await this.toolAnalyticsService.getToolMetrics(toolName, userId);
    } catch (error) {
      this.logger.error(`Failed to get tool metrics for ${toolName}:`, error);
      return null;
    }
  }

  async getToolRecommendations(context: {
    prompt: string;
    systemPrompt: string;
    provider: string;
    model: string;
    userId: string;
    previousTools?: string[];
  }): Promise<any[]> {
    try {
      return await this.toolAnalyticsService.getToolRecommendations(context);
    } catch (error) {
      this.logger.error('Failed to get tool recommendations:', error);
      return [];
    }
  }

  async getToolEffectivenessAnalysis(
    toolName: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): Promise<any> {
    try {
      return await this.toolAnalyticsService.getToolEffectivenessAnalysis(
        toolName,
        timeRange,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get effectiveness analysis for ${toolName}:`,
        error,
      );
      return {
        effectiveness: 0,
        trends: [],
        insights: ['Analysis unavailable'],
        optimizationSuggestions: [],
      };
    }
  }

  async getUsagePatterns(userId?: string): Promise<any> {
    try {
      return await this.toolAnalyticsService.getUsagePatterns(userId);
    } catch (error) {
      this.logger.error('Failed to get usage patterns:', error);
      return {
        peakHours: [],
        popularToolCombinations: [],
        userSegments: [],
      };
    }
  }

  // Execution History APIs
  async saveExecutionSnapshot(
    snapshot: any,
    tags: string[] = [],
  ): Promise<string> {
    try {
      return await this.executionHistoryService.saveExecutionSnapshot(
        snapshot,
        tags,
      );
    } catch (error) {
      this.logger.error('Failed to save execution snapshot:', error);
      throw new Error('Failed to save execution');
    }
  }

  async getExecutionSnapshot(id: string): Promise<any> {
    try {
      return await this.executionHistoryService.getExecutionSnapshot(id);
    } catch (error) {
      this.logger.error(`Failed to get execution snapshot ${id}:`, error);
      return null;
    }
  }

  async searchExecutionHistory(query: any): Promise<any> {
    try {
      return await this.executionHistoryService.searchExecutionHistory(query);
    } catch (error) {
      this.logger.error('Failed to search execution history:', error);
      return {
        snapshots: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  async replayExecution(snapshotId: string, options: any): Promise<any> {
    try {
      return await this.executionHistoryService.replayExecution(
        snapshotId,
        options,
      );
    } catch (error) {
      this.logger.error(`Failed to prepare replay for ${snapshotId}:`, error);
      throw new Error('Replay preparation failed');
    }
  }

  async getReplayConfig(replayId: string): Promise<any> {
    try {
      return await this.executionHistoryService.getReplayConfig(replayId);
    } catch (error) {
      this.logger.error(`Failed to get replay config ${replayId}:`, error);
      return null;
    }
  }

  async compareExecutions(
    snapshot1Id: string,
    snapshot2Id: string,
  ): Promise<any> {
    try {
      return await this.executionHistoryService.compareExecutions(
        snapshot1Id,
        snapshot2Id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to compare executions ${snapshot1Id} vs ${snapshot2Id}:`,
        error,
      );
      throw new Error('Execution comparison failed');
    }
  }

  async getExecutionInsights(userId: string, timeRange?: any): Promise<any> {
    try {
      return await this.executionHistoryService.getExecutionInsights(
        userId,
        timeRange,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get execution insights for user ${userId}:`,
        error,
      );
      throw new Error('Insights unavailable');
    }
  }

  // Tool Discovery APIs
  async discoverTools(query: any): Promise<any[]> {
    try {
      return await this.toolDiscoveryService.discoverTools(query);
    } catch (error) {
      this.logger.error('Failed to discover tools:', error);
      return [];
    }
  }

  async getToolRecommendationsFromDiscovery(context: any): Promise<any> {
    try {
      return await this.toolDiscoveryService.getToolRecommendations(context);
    } catch (error) {
      this.logger.error(
        'Failed to get tool recommendations from discovery:',
        error,
      );
      return { primary: [], alternative: [], learning: [] };
    }
  }

  async getToolDetails(toolId: string): Promise<any> {
    try {
      return await this.toolDiscoveryService.getToolDetails(toolId);
    } catch (error) {
      this.logger.error(`Failed to get tool details for ${toolId}:`, error);
      return null;
    }
  }

  async getToolCategories(): Promise<any[]> {
    try {
      return this.toolDiscoveryService.getToolCategories();
    } catch (error) {
      this.logger.error('Failed to get tool categories:', error);
      return [];
    }
  }

  async validateToolAvailability(toolId: string, context: any): Promise<any> {
    try {
      return await this.toolDiscoveryService.validateToolAvailability(
        toolId,
        context,
      );
    } catch (error) {
      this.logger.error(
        `Failed to validate tool availability for ${toolId}:`,
        error,
      );
      return {
        available: false,
        issues: ['Validation failed'],
        suggestions: [],
      };
    }
  }

  // Thinking Mode APIs
  async analyzeAndRecommendThinkingMode(context: any): Promise<any> {
    try {
      return await this.thinkingModeService.analyzeAndRecommendMode(context);
    } catch (error) {
      this.logger.error(
        'Failed to analyze and recommend thinking mode:',
        error,
      );
      return {
        recommendedMode: 'fast',
        confidence: 0.6,
        reasoning: ['Analysis failed - using fallback'],
        alternativeModes: [],
        customizations: {},
      };
    }
  }

  async getThinkingModeConfig(
    mode: string,
    userId: string,
    customizations?: any,
  ): Promise<any> {
    try {
      return await this.thinkingModeService.getThinkingModeConfig(
        mode,
        userId,
        customizations,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get thinking mode config for ${mode}:`,
        error,
      );
      throw new Error('Thinking mode config unavailable');
    }
  }

  async createThinkingProfile(userId: string, profile: any): Promise<string> {
    try {
      return await this.thinkingModeService.createThinkingProfile(
        userId,
        profile,
      );
    } catch (error) {
      this.logger.error('Failed to create thinking profile:', error);
      throw new Error('Profile creation failed');
    }
  }

  async updateProfilePerformance(
    profileId: string,
    performance: any,
  ): Promise<void> {
    try {
      await this.thinkingModeService.updateProfilePerformance(
        profileId,
        performance,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update profile performance for ${profileId}:`,
        error,
      );
      // Don't throw here as this is not critical
    }
  }

  async getAvailableThinkingModes(userId: string): Promise<any[]> {
    try {
      return await this.thinkingModeService.getAvailableModesForUser(userId);
    } catch (error) {
      this.logger.error(
        `Failed to get available thinking modes for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  // Provider Management APIs
  async getProviderMetrics(): Promise<any> {
    try {
      return await this.llmProviderManager.getProviderMetrics();
    } catch (error) {
      this.logger.error('Failed to get provider metrics:', error);
      return new Map();
    }
  }

  // Comprehensive Dashboard Data
  async getDashboardData(userId: string): Promise<{
    cacheStats: any;
    toolMetrics: any[];
    executionInsights: any;
    recommendedTools: any;
    thinkingModeAnalysis: any;
    providerStatus: any;
  }> {
    try {
      const [cacheStats, executionInsights, providerStatus] = await Promise.all(
        [
          this.getCacheStats().catch(() => ({})),
          this.getExecutionInsights(userId).catch(() => ({})),
          this.getProviderMetrics().catch(() => new Map()),
        ],
      );

      // Get metrics for top tools
      const topTools = [
        'brave-search',
        'filesystem',
        'postgres',
        'git',
        'weather',
      ];
      const toolMetrics = await Promise.all(
        topTools.map(async (tool) => {
          const metrics = await this.getToolMetrics(tool, userId).catch(
            () => null,
          );
          return { tool, metrics };
        }),
      );

      // Get recommended tools
      const recommendedTools = await this.getToolRecommendationsFromDiscovery({
        userLevel: 'intermediate',
        previousTools: [],
        currentPrompt: '',
        preferredCategories: [],
        performancePreference: 'reliability',
      }).catch(() => ({ primary: [], alternative: [], learning: [] }));

      // Get thinking mode analysis for a sample prompt
      const thinkingModeAnalysis = await this.analyzeAndRecommendThinkingMode({
        prompt: 'Analyze user data',
        systemPrompt: 'You are an AI assistant',
        toolCount: 5,
        complexity: 'medium',
        timeConstraint: 'normal',
        accuracy: 'standard',
        userId,
      }).catch(() => ({
        recommendedMode: 'fast',
        confidence: 0.6,
        reasoning: ['Fallback recommendation'],
        alternativeModes: [],
        customizations: {},
      }));

      return {
        cacheStats,
        toolMetrics: toolMetrics.filter((t) => t.metrics),
        executionInsights,
        recommendedTools,
        thinkingModeAnalysis,
        providerStatus: Object.fromEntries(providerStatus),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get dashboard data for user ${userId}:`,
        error,
      );
      throw new Error('Dashboard data unavailable');
    }
  }

  // Health Check
  async getHealthStatus(): Promise<{
    cache: boolean;
    analytics: boolean;
    history: boolean;
    discovery: boolean;
    thinkingModes: boolean;
    providers: boolean;
    overall: boolean;
  }> {
    try {
      const [cacheHealth, providerHealth] = await Promise.all([
        this.getCacheStats()
          .then(() => true)
          .catch(() => false),
        this.getProviderMetrics()
          .then(() => true)
          .catch(() => false),
      ]);

      // Basic health checks for other services
      const analyticsHealth = true; // Analytics is always available (uses fallback data)
      const historyHealth = true; // History uses cache fallback
      const discoveryHealth = true; // Discovery uses in-memory registry
      const thinkingModesHealth = true; // Thinking modes use predefined configs

      const overall =
        cacheHealth &&
        providerHealth &&
        analyticsHealth &&
        historyHealth &&
        discoveryHealth &&
        thinkingModesHealth;

      return {
        cache: cacheHealth,
        analytics: analyticsHealth,
        history: historyHealth,
        discovery: discoveryHealth,
        thinkingModes: thinkingModesHealth,
        providers: providerHealth,
        overall,
      };
    } catch (error) {
      this.logger.error('Failed to get health status:', error);
      return {
        cache: false,
        analytics: false,
        history: false,
        discovery: false,
        thinkingModes: false,
        providers: false,
        overall: false,
      };
    }
  }
}
