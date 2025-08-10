import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { SubscriptionService } from './SubscriptionService';
import { CacheService } from './CacheService';

interface ThinkingModeConfig {
  mode:
    | 'fast'
    | 'deliberate'
    | 'collaborative'
    | 'creative'
    | 'analytical'
    | 'custom';
  parameters: {
    planningDepth: 'shallow' | 'moderate' | 'deep';
    reflectionLevel: 'none' | 'basic' | 'comprehensive';
    toolSelectionStrategy: 'quick' | 'thorough' | 'exhaustive';
    confidenceThreshold: number; // 0-1
    maxIterations: number;
    timeoutMultiplier: number; // Multiplier for base timeout
    parallelProcessing: boolean;
    selfCorrection: boolean;
    explainReasoning: boolean;
    considerAlternatives: boolean;
    useHistoricalContext: boolean;
  };
  customSettings?: {
    stepTypes: string[];
    customPrompts: Record<string, string>;
    executionOrder: string[];
    conditionalLogic: Record<string, any>;
  };
}

interface ThinkingProfile {
  id: string;
  name: string;
  description: string;
  config: ThinkingModeConfig;
  userId: string;
  isDefault: boolean;
  useCount: number;
  averagePerformance: {
    successRate: number;
    averageTime: number;
    userSatisfaction: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ThinkingModeAnalysis {
  recommendedMode: string;
  confidence: number;
  reasoning: string[];
  alternativeModes: Array<{
    mode: string;
    score: number;
    reason: string;
  }>;
  customizations: Record<string, any>;
}

@Injectable()
export class ThinkingModeService {
  private readonly logger = new Logger(ThinkingModeService.name);
  private predefinedModes = new Map<string, ThinkingModeConfig>();
  private userProfiles = new Map<string, ThinkingProfile[]>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly subscriptionService: SubscriptionService,
    private readonly cacheService: CacheService,
  ) {
    this.initializePredefinedModes();
  }

  /**
   * Initialize predefined thinking modes with detailed configurations
   */
  private initializePredefinedModes(): void {
    const modes: Array<{ id: string; config: ThinkingModeConfig }> = [
      {
        id: 'fast',
        config: {
          mode: 'fast',
          parameters: {
            planningDepth: 'shallow',
            reflectionLevel: 'none',
            toolSelectionStrategy: 'quick',
            confidenceThreshold: 0.6,
            maxIterations: 3,
            timeoutMultiplier: 1.0,
            parallelProcessing: false,
            selfCorrection: false,
            explainReasoning: false,
            considerAlternatives: false,
            useHistoricalContext: false,
          },
        },
      },
      {
        id: 'deliberate',
        config: {
          mode: 'deliberate',
          parameters: {
            planningDepth: 'deep',
            reflectionLevel: 'comprehensive',
            toolSelectionStrategy: 'thorough',
            confidenceThreshold: 0.8,
            maxIterations: 10,
            timeoutMultiplier: 2.0,
            parallelProcessing: false,
            selfCorrection: true,
            explainReasoning: true,
            considerAlternatives: true,
            useHistoricalContext: true,
          },
        },
      },
      {
        id: 'collaborative',
        config: {
          mode: 'collaborative',
          parameters: {
            planningDepth: 'moderate',
            reflectionLevel: 'basic',
            toolSelectionStrategy: 'thorough',
            confidenceThreshold: 0.7,
            maxIterations: 6,
            timeoutMultiplier: 1.5,
            parallelProcessing: true,
            selfCorrection: true,
            explainReasoning: true,
            considerAlternatives: true,
            useHistoricalContext: true,
          },
        },
      },
      {
        id: 'creative',
        config: {
          mode: 'creative',
          parameters: {
            planningDepth: 'moderate',
            reflectionLevel: 'basic',
            toolSelectionStrategy: 'exhaustive',
            confidenceThreshold: 0.5,
            maxIterations: 8,
            timeoutMultiplier: 1.8,
            parallelProcessing: true,
            selfCorrection: false,
            explainReasoning: true,
            considerAlternatives: true,
            useHistoricalContext: false,
          },
        },
      },
      {
        id: 'analytical',
        config: {
          mode: 'analytical',
          parameters: {
            planningDepth: 'deep',
            reflectionLevel: 'comprehensive',
            toolSelectionStrategy: 'exhaustive',
            confidenceThreshold: 0.9,
            maxIterations: 12,
            timeoutMultiplier: 2.5,
            parallelProcessing: false,
            selfCorrection: true,
            explainReasoning: true,
            considerAlternatives: true,
            useHistoricalContext: true,
          },
        },
      },
    ];

    for (const { id, config } of modes) {
      this.predefinedModes.set(id, config);
    }

    this.logger.log(`Initialized ${modes.length} predefined thinking modes`);
  }

  /**
   * Analyze context and recommend optimal thinking mode
   */
  async analyzeAndRecommendMode(context: {
    prompt: string;
    systemPrompt: string;
    toolCount: number;
    complexity: 'low' | 'medium' | 'high';
    timeConstraint: 'urgent' | 'normal' | 'flexible';
    accuracy: 'standard' | 'high' | 'critical';
    userId: string;
    previousModes?: string[];
  }): Promise<ThinkingModeAnalysis> {
    try {
      const analysis: ThinkingModeAnalysis = {
        recommendedMode: 'fast',
        confidence: 0.5,
        reasoning: [],
        alternativeModes: [],
        customizations: {},
      };

      // Check user subscription for available modes
      const availableModes =
        await this.subscriptionService.getAvailableThinkingModes(
          context.userId,
        );

      // Analyze context factors
      const scores = new Map<string, number>();

      // Initialize scores for available modes
      for (const mode of availableModes) {
        scores.set(mode, 0.5); // Base score
      }

      // Time constraint analysis
      if (context.timeConstraint === 'urgent') {
        scores.set('fast', (scores.get('fast') || 0) + 0.3);
        analysis.reasoning.push('Urgent time constraint favors fast mode');
      } else if (context.timeConstraint === 'flexible') {
        scores.set('deliberate', (scores.get('deliberate') || 0) + 0.2);
        scores.set('analytical', (scores.get('analytical') || 0) + 0.25);
        analysis.reasoning.push(
          'Flexible timing allows for more thorough modes',
        );
      }

      // Complexity analysis
      if (context.complexity === 'high') {
        scores.set('deliberate', (scores.get('deliberate') || 0) + 0.25);
        scores.set('analytical', (scores.get('analytical') || 0) + 0.3);
        analysis.reasoning.push(
          'High complexity benefits from deeper thinking',
        );
      } else if (context.complexity === 'low') {
        scores.set('fast', (scores.get('fast') || 0) + 0.2);
        analysis.reasoning.push('Low complexity suitable for fast processing');
      }

      // Accuracy requirements
      if (context.accuracy === 'critical') {
        scores.set('analytical', (scores.get('analytical') || 0) + 0.35);
        scores.set('deliberate', (scores.get('deliberate') || 0) + 0.25);
        analysis.reasoning.push(
          'Critical accuracy requires analytical approach',
        );
      } else if (context.accuracy === 'standard') {
        scores.set('collaborative', (scores.get('collaborative') || 0) + 0.15);
        analysis.reasoning.push('Standard accuracy allows balanced approach');
      }

      // Tool count analysis
      if (context.toolCount > 5) {
        scores.set('collaborative', (scores.get('collaborative') || 0) + 0.2);
        scores.set('deliberate', (scores.get('deliberate') || 0) + 0.15);
        analysis.reasoning.push(
          'Many tools available benefit from collaborative selection',
        );
      } else if (context.toolCount === 0) {
        scores.set('fast', (scores.get('fast') || 0) + 0.1);
        analysis.reasoning.push('No tools available simplifies processing');
      }

      // Prompt analysis
      const promptAnalysis = this.analyzePromptComplexity(context.prompt);
      if (promptAnalysis.isCreative) {
        scores.set('creative', (scores.get('creative') || 0) + 0.3);
        analysis.reasoning.push(
          'Creative task detected - creative mode recommended',
        );
      }

      if (promptAnalysis.requiresAnalysis) {
        scores.set('analytical', (scores.get('analytical') || 0) + 0.25);
        analysis.reasoning.push(
          'Analytical task detected - analytical mode recommended',
        );
      }

      if (promptAnalysis.isMultiStep) {
        scores.set('deliberate', (scores.get('deliberate') || 0) + 0.2);
        analysis.reasoning.push(
          'Multi-step task benefits from deliberate planning',
        );
      }

      // Historical performance analysis
      if (context.previousModes && context.previousModes.length > 0) {
        const historicalPerformance = await this.getHistoricalPerformance(
          context.userId,
          context.previousModes,
        );

        for (const [mode, performance] of historicalPerformance) {
          if (performance.successRate > 0.8) {
            scores.set(mode, (scores.get(mode) || 0) + 0.15);
            analysis.reasoning.push(`Historical success with ${mode} mode`);
          }
        }
      }

      // Determine recommended mode
      const sortedModes = Array.from(scores.entries())
        .filter(([mode]) => availableModes.includes(mode))
        .sort(([, a], [, b]) => b - a);

      if (sortedModes.length > 0) {
        const [recommendedMode, score] = sortedModes[0];
        analysis.recommendedMode = recommendedMode;
        analysis.confidence = Math.min(0.95, score);

        // Alternative modes
        analysis.alternativeModes = sortedModes
          .slice(1, 4)
          .map(([mode, score]) => ({
            mode,
            score: Math.round(score * 100) / 100,
            reason: this.getAlternativeReason(mode, context),
          }));
      }

      // Generate customizations
      analysis.customizations = this.generateCustomizations(
        analysis.recommendedMode,
        context,
      );

      return analysis;
    } catch (error) {
      this.logger.error(
        'Failed to analyze and recommend thinking mode:',
        error,
      );

      // Fallback to basic analysis
      return {
        recommendedMode: 'fast',
        confidence: 0.6,
        reasoning: ['Using fallback recommendation due to analysis error'],
        alternativeModes: [],
        customizations: {},
      };
    }
  }

  /**
   * Get thinking mode configuration with user customizations
   */
  async getThinkingModeConfig(
    mode: string,
    userId: string,
    customizations?: Record<string, any>,
  ): Promise<ThinkingModeConfig> {
    try {
      // Check if user has a custom profile for this mode
      const userProfile = await this.getUserProfile(userId, mode);
      if (userProfile) {
        return this.applyCustomizations(userProfile.config, customizations);
      }

      // Get predefined mode
      const baseConfig = this.predefinedModes.get(mode);
      if (!baseConfig) {
        throw new Error(`Unknown thinking mode: ${mode}`);
      }

      return this.applyCustomizations(baseConfig, customizations);
    } catch (error) {
      this.logger.error(
        `Failed to get thinking mode config for ${mode}:`,
        error,
      );
      // Return fast mode as fallback
      return this.predefinedModes.get('fast')!;
    }
  }

  /**
   * Create or update a custom thinking profile
   */
  async createThinkingProfile(
    userId: string,
    profile: Omit<
      ThinkingProfile,
      | 'id'
      | 'userId'
      | 'useCount'
      | 'averagePerformance'
      | 'createdAt'
      | 'updatedAt'
    >,
  ): Promise<string> {
    try {
      // Verify user can create custom profiles
      const subscription =
        await this.subscriptionService.getUserSubscription(userId);
      if (
        !subscription ||
        !subscription.features.includes('custom_thinking_modes')
      ) {
        throw new Error(
          'Custom thinking modes not available in current subscription',
        );
      }

      const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fullProfile: ThinkingProfile = {
        ...profile,
        id: profileId,
        userId,
        useCount: 0,
        averagePerformance: {
          successRate: 0,
          averageTime: 0,
          userSatisfaction: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database if available
      try {
        await (this.databaseService.prisma as any).thinkingProfile?.create({
          data: fullProfile,
        });
      } catch (dbError) {
        // Fall back to cache storage
        await this.cacheService.cacheToolResult(
          { toolName: `thinking-profile:${profileId}`, parameters: {}, userId },
          fullProfile,
          86400, // 24 hours
        );
      }

      // Update in-memory cache
      if (!this.userProfiles.has(userId)) {
        this.userProfiles.set(userId, []);
      }
      this.userProfiles.get(userId)!.push(fullProfile);

      this.logger.log(
        `Created thinking profile ${profileId} for user ${userId}`,
      );
      return profileId;
    } catch (error) {
      this.logger.error('Failed to create thinking profile:', error);
      throw error;
    }
  }

  /**
   * Update thinking profile performance based on execution results
   */
  async updateProfilePerformance(
    profileId: string,
    performance: {
      success: boolean;
      executionTime: number;
      userSatisfaction?: number;
    },
  ): Promise<void> {
    try {
      // This would update the profile's performance metrics
      // For now, just log the update
      this.logger.debug(
        `Updated performance for profile ${profileId}:`,
        performance,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update profile performance for ${profileId}:`,
        error,
      );
    }
  }

  /**
   * Get available thinking modes for user
   */
  async getAvailableModesForUser(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      available: boolean;
      reason?: string;
      config: ThinkingModeConfig;
    }>
  > {
    try {
      const subscription =
        await this.subscriptionService.getUserSubscription(userId);
      const availableModes =
        await this.subscriptionService.getAvailableThinkingModes(userId);

      const modes = [];

      // Add predefined modes
      for (const [id, config] of this.predefinedModes) {
        const available = availableModes.includes(id);
        modes.push({
          id,
          name: this.getModeDisplayName(id),
          description: this.getModeDescription(id),
          available,
          reason: available ? undefined : 'Requires subscription upgrade',
          config,
        });
      }

      // Add user's custom profiles
      const userProfiles = await this.getUserProfiles(userId);
      for (const profile of userProfiles) {
        modes.push({
          id: profile.id,
          name: profile.name,
          description: profile.description,
          available: true,
          config: profile.config,
        });
      }

      return modes;
    } catch (error) {
      this.logger.error(
        `Failed to get available modes for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  // Private helper methods
  private analyzePromptComplexity(prompt: string): {
    isCreative: boolean;
    requiresAnalysis: boolean;
    isMultiStep: boolean;
    estimatedComplexity: number;
  } {
    const creativeTriggers = [
      'create',
      'design',
      'brainstorm',
      'generate',
      'innovative',
      'artistic',
      'creative',
      'imagine',
      'invent',
      'compose',
      'write story',
      'creative writing',
    ];

    const analyticalTriggers = [
      'analyze',
      'evaluate',
      'compare',
      'assess',
      'examine',
      'investigate',
      'research',
      'calculate',
      'measure',
      'statistics',
      'data',
      'metrics',
    ];

    const multiStepTriggers = [
      'step by step',
      'first',
      'then',
      'finally',
      'process',
      'workflow',
      'plan',
      'strategy',
      'sequence',
      'order',
      'stages',
      'phases',
    ];

    const promptLower = prompt.toLowerCase();

    const isCreative = creativeTriggers.some((trigger) =>
      promptLower.includes(trigger),
    );
    const requiresAnalysis = analyticalTriggers.some((trigger) =>
      promptLower.includes(trigger),
    );
    const isMultiStep = multiStepTriggers.some((trigger) =>
      promptLower.includes(trigger),
    );

    // Simple complexity estimation based on length and keywords
    let complexity = Math.min(1.0, prompt.length / 500); // Base on length
    if (isCreative) complexity += 0.2;
    if (requiresAnalysis) complexity += 0.3;
    if (isMultiStep) complexity += 0.25;

    return {
      isCreative,
      requiresAnalysis,
      isMultiStep,
      estimatedComplexity: Math.min(1.0, complexity),
    };
  }

  private async getHistoricalPerformance(
    userId: string,
    modes: string[],
  ): Promise<Map<string, { successRate: number; avgTime: number }>> {
    // This would analyze historical performance data
    // For now, return mock data
    const performance = new Map();

    for (const mode of modes) {
      performance.set(mode, {
        successRate: 0.75 + Math.random() * 0.2, // 75-95%
        avgTime: 1000 + Math.random() * 2000, // 1-3 seconds
      });
    }

    return performance;
  }

  private getAlternativeReason(mode: string, context: any): string {
    const reasons = {
      fast: 'Quick processing for simple tasks',
      deliberate: 'Thorough analysis for complex problems',
      collaborative: 'Balanced approach with tool coordination',
      creative: 'Enhanced creativity for innovative solutions',
      analytical: 'Deep analysis for data-driven tasks',
    };

    return reasons[mode] || 'General-purpose thinking mode';
  }

  private generateCustomizations(
    mode: string,
    context: any,
  ): Record<string, any> {
    const customizations: Record<string, any> = {};

    // Mode-specific customizations
    switch (mode) {
      case 'deliberate':
        if (context.accuracy === 'critical') {
          customizations.confidenceThreshold = 0.9;
          customizations.maxIterations = 15;
        }
        break;
      case 'creative':
        if (context.complexity === 'high') {
          customizations.considerAlternatives = true;
          customizations.maxIterations = 10;
        }
        break;
      case 'fast':
        if (context.timeConstraint === 'urgent') {
          customizations.timeoutMultiplier = 0.8;
          customizations.maxIterations = 2;
        }
        break;
    }

    return customizations;
  }

  private applyCustomizations(
    baseConfig: ThinkingModeConfig,
    customizations?: Record<string, any>,
  ): ThinkingModeConfig {
    if (!customizations) {
      return { ...baseConfig };
    }

    const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    // Apply parameter customizations
    for (const [key, value] of Object.entries(customizations)) {
      if (key in config.parameters) {
        config.parameters[key] = value;
      }
    }

    return config;
  }

  private async getUserProfile(
    userId: string,
    mode: string,
  ): Promise<ThinkingProfile | null> {
    try {
      const profiles = await this.getUserProfiles(userId);
      return profiles.find((p) => p.config.mode === mode) || null;
    } catch (error) {
      this.logger.error(
        `Failed to get user profile for ${userId}, mode ${mode}:`,
        error,
      );
      return null;
    }
  }

  private async getUserProfiles(userId: string): Promise<ThinkingProfile[]> {
    try {
      // Check memory cache first
      if (this.userProfiles.has(userId)) {
        return this.userProfiles.get(userId)!;
      }

      // Try database
      try {
        const profiles = await (
          this.databaseService.prisma as any
        ).thinkingProfile?.findMany({
          where: { userId },
        });

        if (profiles) {
          this.userProfiles.set(userId, profiles);
          return profiles;
        }
      } catch (dbError) {
        this.logger.debug('Database not available for user profiles');
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to get user profiles for ${userId}:`, error);
      return [];
    }
  }

  private getModeDisplayName(mode: string): string {
    const names = {
      fast: 'Fast Thinking',
      deliberate: 'Deliberate Analysis',
      collaborative: 'Collaborative Processing',
      creative: 'Creative Exploration',
      analytical: 'Deep Analysis',
    };

    return names[mode] || mode;
  }

  private getModeDescription(mode: string): string {
    const descriptions = {
      fast: 'Quick processing with minimal overhead - ideal for simple tasks and time-sensitive operations',
      deliberate:
        'Thorough analysis with comprehensive planning and reflection - best for complex problems',
      collaborative:
        'Balanced approach with parallel processing and tool coordination - good for multi-faceted tasks',
      creative:
        'Enhanced exploration of alternatives with reduced constraints - perfect for innovation and brainstorming',
      analytical:
        'Deep, systematic analysis with maximum rigor - essential for critical decision-making',
    };

    return descriptions[mode] || 'Custom thinking mode configuration';
  }
}
