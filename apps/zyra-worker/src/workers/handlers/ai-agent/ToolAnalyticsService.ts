import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { CacheService } from './CacheService';

interface ToolUsageEvent {
  toolName: string;
  userId: string;
  sessionId: string;
  executionId: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  error?: string;
  responseTime: number;
  timestamp: Date;
  context: {
    provider: string;
    model: string;
    thinkingMode: string;
    promptHash: string;
  };
}

interface ToolMetrics {
  toolName: string;
  totalUsage: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  lastUsed: Date;
  popularParameters: Record<string, number>;
  userCount: number;
  effectiveness: number; // 0-1 score based on success rate and usage
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

interface ToolRecommendation {
  toolName: string;
  confidence: number;
  reason: string;
  suggestedParameters?: Record<string, any>;
  alternativeTools?: string[];
}

@Injectable()
export class ToolAnalyticsService {
  private readonly logger = new Logger(ToolAnalyticsService.name);
  private readonly eventBuffer: ToolUsageEvent[] = [];
  private readonly bufferSize = 100;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
  ) {
    this.startPeriodicFlush();
  }

  /**
   * Record tool usage event
   */
  recordToolUsage(event: Omit<ToolUsageEvent, 'timestamp'>): void {
    const fullEvent: ToolUsageEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.eventBuffer.push(fullEvent);

    // Flush buffer if it's full
    if (this.eventBuffer.length >= this.bufferSize) {
      this.flushEventBuffer();
    }

    this.logger.debug(
      `Recorded tool usage: ${event.toolName} (success: ${event.success})`,
    );
  }

  /**
   * Get comprehensive metrics for a specific tool
   */
  async getToolMetrics(
    toolName: string,
    userId?: string,
  ): Promise<ToolMetrics | null> {
    try {
      const cacheKey = `tool:metrics:${toolName}${userId ? `:${userId}` : ''}`;

      // Try cache first
      const cachedMetrics = await this.cacheService.getCachedToolResult({
        toolName: cacheKey,
        parameters: {},
        userId: userId || 'all',
      });

      if (cachedMetrics) {
        return cachedMetrics;
      }

      // Calculate metrics from database
      const metrics = await this.calculateToolMetrics(toolName, userId);

      // Cache for 15 minutes
      if (metrics) {
        await this.cacheService.cacheToolResult(
          { toolName: cacheKey, parameters: {}, userId: userId || 'all' },
          metrics,
          900, // 15 minutes
        );
      }

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get tool metrics for ${toolName}:`, error);
      return null;
    }
  }

  /**
   * Get tool recommendations based on context
   */
  async getToolRecommendations(context: {
    prompt: string;
    systemPrompt: string;
    provider: string;
    model: string;
    userId: string;
    previousTools?: string[];
  }): Promise<ToolRecommendation[]> {
    try {
      const recommendations: ToolRecommendation[] = [];

      // Get all available tools with metrics
      const allToolMetrics = await this.getAllToolMetrics(context.userId);

      // Analyze prompt to suggest relevant tools
      const promptBasedRecommendations = this.analyzePromptForTools(
        context.prompt,
        allToolMetrics,
      );

      // Get collaborative filtering recommendations
      const collaborativeRecommendations =
        await this.getCollaborativeRecommendations(
          context.userId,
          context.previousTools || [],
          allToolMetrics,
        );

      // Combine and rank recommendations
      const combinedRecommendations = this.combineRecommendations(
        promptBasedRecommendations,
        collaborativeRecommendations,
      );

      this.logger.debug(
        `Generated ${combinedRecommendations.length} tool recommendations`,
      );
      return combinedRecommendations.slice(0, 10); // Top 10 recommendations
    } catch (error) {
      this.logger.error('Failed to get tool recommendations:', error);
      return [];
    }
  }

  /**
   * Get tool effectiveness analysis
   */
  async getToolEffectivenessAnalysis(
    toolName: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): Promise<{
    effectiveness: number;
    trends: number[];
    insights: string[];
    optimizationSuggestions: string[];
  }> {
    try {
      const metrics = await this.getToolMetrics(toolName);
      if (!metrics) {
        return {
          effectiveness: 0,
          trends: [],
          insights: ['No usage data available'],
          optimizationSuggestions: [],
        };
      }

      const effectiveness = this.calculateToolEffectiveness(metrics);
      const trends = this.getTrendsForTimeRange(metrics.trends, timeRange);
      const insights = this.generateToolInsights(metrics);
      const optimizationSuggestions =
        this.generateOptimizationSuggestions(metrics);

      return {
        effectiveness,
        trends,
        insights,
        optimizationSuggestions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze tool effectiveness for ${toolName}:`,
        error,
      );
      return {
        effectiveness: 0,
        trends: [],
        insights: ['Analysis failed'],
        optimizationSuggestions: [],
      };
    }
  }

  /**
   * Get usage patterns for optimization
   */
  async getUsagePatterns(userId?: string): Promise<{
    peakHours: number[];
    popularToolCombinations: Array<{
      tools: string[];
      frequency: number;
      successRate: number;
    }>;
    userSegments: Array<{
      segment: string;
      userCount: number;
      favoriteTools: string[];
    }>;
  }> {
    try {
      // This would be implemented with more sophisticated analytics
      // For now, return basic patterns
      return {
        peakHours: [9, 10, 14, 15, 16], // 9-10 AM, 2-4 PM
        popularToolCombinations: [
          {
            tools: ['brave-search', 'filesystem'],
            frequency: 25,
            successRate: 0.85,
          },
          {
            tools: ['postgres', 'filesystem'],
            frequency: 18,
            successRate: 0.92,
          },
        ],
        userSegments: [
          {
            segment: 'developers',
            userCount: 45,
            favoriteTools: ['git', 'filesystem', 'postgres'],
          },
          {
            segment: 'researchers',
            userCount: 23,
            favoriteTools: ['brave-search', 'fetch', 'weather'],
          },
        ],
      };
    } catch (error) {
      this.logger.error('Failed to get usage patterns:', error);
      return {
        peakHours: [],
        popularToolCombinations: [],
        userSegments: [],
      };
    }
  }

  // Private helper methods
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = this.eventBuffer.splice(0, this.bufferSize);

      // Store events in database
      for (const event of events) {
        try {
          await this.storeToolUsageEvent(event);
        } catch (error) {
          this.logger.error('Failed to store tool usage event:', error);
        }
      }

      this.logger.debug(`Flushed ${events.length} tool usage events`);
    } catch (error) {
      this.logger.error('Failed to flush event buffer:', error);
    }
  }

  private async storeToolUsageEvent(event: ToolUsageEvent): Promise<void> {
    try {
      // Try to store in database if the table exists
      await (this.databaseService.prisma as any).toolUsageEvent?.create({
        data: {
          toolName: event.toolName,
          userId: event.userId,
          sessionId: event.sessionId,
          executionId: event.executionId,
          parameters: event.parameters,
          result: event.result,
          success: event.success,
          error: event.error,
          responseTime: event.responseTime,
          timestamp: event.timestamp,
          context: event.context,
        },
      });
    } catch (error) {
      // If database table doesn't exist, store in cache for now
      const cacheKey = `events:tool:${event.toolName}:${Date.now()}`;
      await this.cacheService.cacheToolResult(
        { toolName: cacheKey, parameters: {}, userId: event.userId },
        event,
        3600, // 1 hour
      );
    }
  }

  private async calculateToolMetrics(
    toolName: string,
    userId?: string,
  ): Promise<ToolMetrics | null> {
    try {
      // This would query the database for real metrics
      // For now, return mock data based on tool name
      const mockMetrics: ToolMetrics = {
        toolName,
        totalUsage: Math.floor(Math.random() * 100) + 10,
        successRate: 0.75 + Math.random() * 0.2, // 75-95%
        avgResponseTime: 500 + Math.random() * 2000, // 500-2500ms
        errorRate: Math.random() * 0.15, // 0-15%
        lastUsed: new Date(),
        popularParameters: this.getMockPopularParameters(toolName),
        userCount: Math.floor(Math.random() * 20) + 5,
        effectiveness: 0,
        trends: {
          hourly: Array.from({ length: 24 }, () =>
            Math.floor(Math.random() * 10),
          ),
          daily: Array.from({ length: 7 }, () =>
            Math.floor(Math.random() * 50),
          ),
          weekly: Array.from({ length: 4 }, () =>
            Math.floor(Math.random() * 200),
          ),
        },
      };

      mockMetrics.effectiveness = this.calculateToolEffectiveness(mockMetrics);
      return mockMetrics;
    } catch (error) {
      this.logger.error(`Failed to calculate metrics for ${toolName}:`, error);
      return null;
    }
  }

  private getMockPopularParameters(toolName: string): Record<string, number> {
    const parameterPatterns: Record<string, Record<string, number>> = {
      'brave-search': { query: 45, count: 25, freshness: 15 },
      filesystem: { path: 60, recursive: 20, pattern: 15 },
      postgres: { sql: 80, timeout: 10, format: 10 },
      git: { command: 50, repository: 30, branch: 20 },
      weather: { location: 70, units: 20, forecast: 10 },
      fetch: { url: 85, method: 10, headers: 5 },
    };

    return parameterPatterns[toolName] || {};
  }

  private async getAllToolMetrics(userId: string): Promise<ToolMetrics[]> {
    // This would query for all tools used by similar users or in similar contexts
    const commonTools = [
      'brave-search',
      'filesystem',
      'postgres',
      'git',
      'weather',
      'fetch',
      'puppeteer',
      'time',
    ];

    const metrics: ToolMetrics[] = [];
    for (const toolName of commonTools) {
      const toolMetrics = await this.calculateToolMetrics(toolName, userId);
      if (toolMetrics) {
        metrics.push(toolMetrics);
      }
    }

    return metrics;
  }

  private analyzePromptForTools(
    prompt: string,
    allMetrics: ToolMetrics[],
  ): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = [];
    const promptLower = prompt.toLowerCase();

    // Keyword-based analysis
    const toolKeywords: Record<string, string[]> = {
      'brave-search': [
        'search',
        'find',
        'look up',
        'research',
        'query',
        'information',
      ],
      filesystem: [
        'file',
        'directory',
        'folder',
        'read',
        'write',
        'save',
        'load',
      ],
      postgres: [
        'database',
        'sql',
        'query',
        'table',
        'data',
        'select',
        'insert',
      ],
      git: ['git', 'repository', 'commit', 'branch', 'version', 'code'],
      weather: [
        'weather',
        'temperature',
        'forecast',
        'climate',
        'rain',
        'sunny',
      ],
      fetch: ['fetch', 'api', 'http', 'request', 'url', 'endpoint'],
      puppeteer: ['browser', 'screenshot', 'scrape', 'web', 'page', 'html'],
      time: ['time', 'date', 'now', 'current', 'when', 'schedule'],
    };

    for (const [toolName, keywords] of Object.entries(toolKeywords)) {
      const matchCount = keywords.filter((keyword) =>
        promptLower.includes(keyword),
      ).length;

      if (matchCount > 0) {
        const toolMetrics = allMetrics.find((m) => m.toolName === toolName);
        const confidence = Math.min(
          0.9,
          (matchCount / keywords.length) * 0.7 + 0.2,
        );

        recommendations.push({
          toolName,
          confidence,
          reason: `Detected ${matchCount} relevant keywords: ${keywords.filter((k) => promptLower.includes(k)).join(', ')}`,
          suggestedParameters: this.suggestParametersFromPrompt(
            toolName,
            prompt,
          ),
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  private async getCollaborativeRecommendations(
    userId: string,
    previousTools: string[],
    allMetrics: ToolMetrics[],
  ): Promise<ToolRecommendation[]> {
    // Collaborative filtering based on tool combinations and user patterns
    const recommendations: ToolRecommendation[] = [];

    // If user has used certain tools, recommend frequently used combinations
    const toolCombinations: Record<string, string[]> = {
      'brave-search': ['fetch', 'filesystem'],
      filesystem: ['git', 'postgres'],
      postgres: ['filesystem', 'fetch'],
      git: ['filesystem', 'puppeteer'],
    };

    for (const previousTool of previousTools) {
      const relatedTools = toolCombinations[previousTool] || [];

      for (const relatedTool of relatedTools) {
        const toolMetrics = allMetrics.find((m) => m.toolName === relatedTool);

        if (toolMetrics && !previousTools.includes(relatedTool)) {
          recommendations.push({
            toolName: relatedTool,
            confidence: toolMetrics.effectiveness * 0.6,
            reason: `Frequently used with ${previousTool}`,
            alternativeTools: toolCombinations[relatedTool]?.filter(
              (t) => t !== previousTool,
            ),
          });
        }
      }
    }

    return recommendations;
  }

  private combineRecommendations(
    promptBased: ToolRecommendation[],
    collaborative: ToolRecommendation[],
  ): ToolRecommendation[] {
    const combined = new Map<string, ToolRecommendation>();

    // Add prompt-based recommendations
    for (const rec of promptBased) {
      combined.set(rec.toolName, rec);
    }

    // Merge collaborative recommendations
    for (const rec of collaborative) {
      const existing = combined.get(rec.toolName);
      if (existing) {
        // Boost confidence if both methods recommend the same tool
        existing.confidence = Math.min(
          0.95,
          existing.confidence + rec.confidence * 0.3,
        );
        existing.reason += ` + ${rec.reason}`;
        if (rec.alternativeTools) {
          existing.alternativeTools = rec.alternativeTools;
        }
      } else {
        combined.set(rec.toolName, rec);
      }
    }

    return Array.from(combined.values()).sort(
      (a, b) => b.confidence - a.confidence,
    );
  }

  private suggestParametersFromPrompt(
    toolName: string,
    prompt: string,
  ): Record<string, any> {
    const suggestions: Record<string, any> = {};

    // Extract parameters based on tool type and prompt content
    switch (toolName) {
      case 'brave-search':
        // Extract search terms
        const searchMatch = prompt.match(
          /(?:search|find|look up|query)\s+(?:for\s+)?["']?([^"'\n.!?]+)["']?/i,
        );
        if (searchMatch) {
          suggestions.query = searchMatch[1].trim();
        }
        break;

      case 'filesystem':
        // Extract file paths
        const pathMatch = prompt.match(
          /(?:file|path|directory)\s+["']?([^"'\s]+)["']?/i,
        );
        if (pathMatch) {
          suggestions.path = pathMatch[1];
        }
        break;

      case 'postgres':
        // Extract SQL-like patterns
        const sqlMatch = prompt.match(
          /(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)[\s\S]*?(?=;|$)/i,
        );
        if (sqlMatch) {
          suggestions.sql = sqlMatch[0].trim();
        }
        break;

      case 'weather':
        // Extract location
        const locationMatch = prompt.match(
          /(?:weather|forecast|temperature)\s+(?:in|for|at)\s+([^.,!?\n]+)/i,
        );
        if (locationMatch) {
          suggestions.location = locationMatch[1].trim();
        }
        break;

      case 'fetch':
        // Extract URLs
        const urlMatch = prompt.match(/(https?:\/\/[^\s"'<>]+)/i);
        if (urlMatch) {
          suggestions.url = urlMatch[1];
        }
        break;
    }

    return suggestions;
  }

  private calculateToolEffectiveness(metrics: ToolMetrics): number {
    // Composite score based on multiple factors
    const successWeight = 0.4;
    const usageWeight = 0.3;
    const responseTimeWeight = 0.2;
    const userAdoptionWeight = 0.1;

    // Normalize metrics to 0-1 scale
    const successScore = metrics.successRate;
    const usageScore = Math.min(1, metrics.totalUsage / 100); // Assume 100 is high usage
    const responseTimeScore = Math.max(0, 1 - metrics.avgResponseTime / 5000); // 5s is poor
    const userAdoptionScore = Math.min(1, metrics.userCount / 50); // 50 users is high adoption

    const effectiveness =
      successScore * successWeight +
      usageScore * usageWeight +
      responseTimeScore * responseTimeWeight +
      userAdoptionScore * userAdoptionWeight;

    return Math.round(effectiveness * 100) / 100; // Round to 2 decimal places
  }

  private getTrendsForTimeRange(
    trends: ToolMetrics['trends'],
    timeRange: string,
  ): number[] {
    switch (timeRange) {
      case 'hour':
        return trends.hourly;
      case 'day':
        return trends.daily;
      case 'week':
        return trends.weekly;
      case 'month':
        return trends.weekly; // Use weekly data for monthly view
      default:
        return trends.daily;
    }
  }

  private generateToolInsights(metrics: ToolMetrics): string[] {
    const insights: string[] = [];

    if (metrics.successRate > 0.9) {
      insights.push('High reliability - tool rarely fails');
    } else if (metrics.successRate < 0.7) {
      insights.push(
        'Low reliability - consider investigating common failure modes',
      );
    }

    if (metrics.avgResponseTime > 3000) {
      insights.push('Slow response time - may impact user experience');
    } else if (metrics.avgResponseTime < 500) {
      insights.push('Fast response time - excellent performance');
    }

    if (metrics.totalUsage > 50) {
      insights.push('Popular tool - high usage indicates strong value');
    } else if (metrics.totalUsage < 5) {
      insights.push('Low usage - may need better discovery or documentation');
    }

    const peakDay = metrics.trends.daily.indexOf(
      Math.max(...metrics.trends.daily),
    );
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    insights.push(`Peak usage on ${dayNames[peakDay]}`);

    return insights;
  }

  private generateOptimizationSuggestions(metrics: ToolMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.errorRate > 0.15) {
      suggestions.push('Implement better error handling and retry mechanisms');
    }

    if (metrics.avgResponseTime > 2000) {
      suggestions.push('Consider caching frequently requested results');
      suggestions.push('Optimize tool execution or add timeout controls');
    }

    if (metrics.successRate < 0.8) {
      suggestions.push(
        'Review common failure patterns and improve tool robustness',
      );
      suggestions.push('Add input validation to prevent common errors');
    }

    if (metrics.userCount < 10) {
      suggestions.push('Improve tool documentation and discoverability');
      suggestions.push('Consider adding usage examples or tutorials');
    }

    // Parameter-based suggestions
    const topParameters = Object.keys(metrics.popularParameters).slice(0, 3);
    if (topParameters.length > 0) {
      suggestions.push(
        `Consider providing defaults for popular parameters: ${topParameters.join(', ')}`,
      );
    }

    return suggestions;
  }

  private startPeriodicFlush(): void {
    // Flush event buffer every 30 seconds
    setInterval(() => {
      this.flushEventBuffer();
    }, 30 * 1000);
  }
}
