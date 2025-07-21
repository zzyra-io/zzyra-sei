import { Injectable, Logger } from "@nestjs/common";

interface FeedbackData {
  id: string;
  userId: string;
  sessionId: string;
  feedbackType: 'workflow_generation' | 'block_generation' | 'validation' | 'general';
  rating: number; // 1-5 scale
  feedback: string;
  metadata: {
    generationPrompt?: string;
    generatedOutput?: unknown;
    executionResult?: 'success' | 'failure' | 'partial';
    processingTime?: number;
    validationErrors?: number;
    timestamp: Date;
    context?: Record<string, unknown>;
  };
  processed: boolean;
  improvements?: string[];
}

interface LearningPattern {
  id: string;
  pattern: string;
  confidence: number;
  category: 'prompt_optimization' | 'validation_improvement' | 'user_preference' | 'error_reduction';
  examples: Array<{
    input: string;
    output: unknown;
    rating: number;
    timestamp: Date;
  }>;
  metadata: Record<string, unknown>;
}

interface PromptOptimization {
  originalPrompt: string;
  optimizedPrompt: string;
  improvement: string;
  confidence: number;
  testResults?: {
    originalPerformance: number;
    optimizedPerformance: number;
    improvementPercent: number;
  };
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private feedback: FeedbackData[] = [];
  private learningPatterns = new Map<string, LearningPattern>();
  private promptOptimizations: PromptOptimization[] = [];

  /**
   * Record user feedback
   */
  async recordFeedback(
    userId: string,
    sessionId: string,
    feedbackType: FeedbackData['feedbackType'],
    rating: number,
    feedback: string,
    metadata: Omit<FeedbackData['metadata'], 'timestamp'>
  ): Promise<string> {
    const feedbackData: FeedbackData = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      sessionId,
      feedbackType,
      rating,
      feedback,
      metadata: {
        ...metadata,
        timestamp: new Date(),
      },
      processed: false,
      improvements: [],
    };

    this.feedback.push(feedbackData);
    
    this.logger.log(`Received ${feedbackType} feedback from user ${userId}: ${rating}/5 stars`);

    // Process feedback for learning patterns
    await this.processFeedback(feedbackData);

    return feedbackData.id;
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(timeRange?: { start: Date; end: Date }): {
    totalFeedback: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    feedbackByType: Record<string, { count: number; averageRating: number }>;
    trends: {
      improvementTrend: 'positive' | 'negative' | 'stable';
      recentAverageRating: number;
      previousAverageRating: number;
    };
  } {
    let feedbackData = this.feedback;

    if (timeRange) {
      feedbackData = feedbackData.filter(f => 
        f.metadata.timestamp >= timeRange.start && 
        f.metadata.timestamp <= timeRange.end
      );
    }

    if (feedbackData.length === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        ratingDistribution: {},
        feedbackByType: {},
        trends: {
          improvementTrend: 'stable',
          recentAverageRating: 0,
          previousAverageRating: 0,
        },
      };
    }

    const totalFeedback = feedbackData.length;
    const averageRating = feedbackData.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;

    // Rating distribution
    const ratingDistribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = feedbackData.filter(f => f.rating === i).length;
    }

    // Feedback by type
    const feedbackByType: Record<string, { count: number; averageRating: number }> = {};
    const types = [...new Set(feedbackData.map(f => f.feedbackType))];
    
    for (const type of types) {
      const typeFeedback = feedbackData.filter(f => f.feedbackType === type);
      feedbackByType[type] = {
        count: typeFeedback.length,
        averageRating: typeFeedback.reduce((sum, f) => sum + f.rating, 0) / typeFeedback.length,
      };
    }

    // Trends analysis
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentFeedback = feedbackData.filter(f => f.metadata.timestamp >= sevenDaysAgo);
    const previousFeedback = feedbackData.filter(f => 
      f.metadata.timestamp >= fourteenDaysAgo && f.metadata.timestamp < sevenDaysAgo
    );

    const recentAverageRating = recentFeedback.length > 0 
      ? recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length 
      : 0;
    
    const previousAverageRating = previousFeedback.length > 0
      ? previousFeedback.reduce((sum, f) => sum + f.rating, 0) / previousFeedback.length
      : 0;

    let improvementTrend: 'positive' | 'negative' | 'stable' = 'stable';
    if (recentAverageRating > previousAverageRating + 0.2) {
      improvementTrend = 'positive';
    } else if (recentAverageRating < previousAverageRating - 0.2) {
      improvementTrend = 'negative';
    }

    return {
      totalFeedback,
      averageRating,
      ratingDistribution,
      feedbackByType,
      trends: {
        improvementTrend,
        recentAverageRating,
        previousAverageRating,
      },
    };
  }

  /**
   * Get learning patterns
   */
  getLearningPatterns(): LearningPattern[] {
    return Array.from(this.learningPatterns.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get prompt optimizations
   */
  getPromptOptimizations(): PromptOptimization[] {
    return this.promptOptimizations
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get recommendations based on feedback
   */
  getRecommendations(): {
    promptImprovements: string[];
    validationEnhancements: string[];
    userExperienceImprovements: string[];
    systemOptimizations: string[];
  } {
    const recommendations = {
      promptImprovements: [] as string[],
      validationEnhancements: [] as string[],
      userExperienceImprovements: [] as string[],
      systemOptimizations: [] as string[],
    };

    // Analyze low-rated feedback
    const lowRatedFeedback = this.feedback.filter(f => f.rating <= 2);
    const commonIssues = this.identifyCommonIssues(lowRatedFeedback);

    for (const issue of commonIssues) {
      switch (issue.category) {
        case 'prompt_quality':
          recommendations.promptImprovements.push(issue.recommendation);
          break;
        case 'validation_accuracy':
          recommendations.validationEnhancements.push(issue.recommendation);
          break;
        case 'user_experience':
          recommendations.userExperienceImprovements.push(issue.recommendation);
          break;
        case 'performance':
          recommendations.systemOptimizations.push(issue.recommendation);
          break;
      }
    }

    // Add learning pattern-based recommendations
    const patterns = this.getLearningPatterns();
    for (const pattern of patterns.slice(0, 5)) { // Top 5 patterns
      if (pattern.category === 'prompt_optimization') {
        recommendations.promptImprovements.push(
          `Consider implementing: ${pattern.pattern} (confidence: ${Math.round(pattern.confidence * 100)}%)`
        );
      }
    }

    return recommendations;
  }

  /**
   * Apply learning insights to improve future generations
   */
  async applyLearnings(): Promise<{
    appliedOptimizations: number;
    newPatterns: number;
    confidenceThreshold: number;
  }> {
    const confidenceThreshold = 0.7;
    let appliedOptimizations = 0;
    let newPatterns = 0;

    // Apply high-confidence prompt optimizations
    const highConfidenceOptimizations = this.promptOptimizations
      .filter(opt => opt.confidence >= confidenceThreshold);

    for (const optimization of highConfidenceOptimizations) {
      // In a real implementation, you would update prompt templates here
      this.logger.log(`Applying prompt optimization: ${optimization.improvement}`);
      appliedOptimizations++;
    }

    // Generate new learning patterns from recent feedback
    const recentFeedback = this.feedback.filter(f => 
      f.metadata.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const newPatternsFound = await this.extractLearningPatterns(recentFeedback);
    newPatterns = newPatternsFound.length;

    for (const pattern of newPatternsFound) {
      this.learningPatterns.set(pattern.id, pattern);
    }

    this.logger.log(`Applied ${appliedOptimizations} optimizations and found ${newPatterns} new patterns`);

    return {
      appliedOptimizations,
      newPatterns,
      confidenceThreshold,
    };
  }

  /**
   * Get user-specific insights
   */
  getUserInsights(userId: string): {
    totalFeedback: number;
    averageRating: number;
    preferredFeatures: string[];
    commonChallenges: string[];
    improvementSuggestions: string[];
  } {
    const userFeedback = this.feedback.filter(f => f.userId === userId);
    
    if (userFeedback.length === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        preferredFeatures: [],
        commonChallenges: [],
        improvementSuggestions: [],
      };
    }

    const totalFeedback = userFeedback.length;
    const averageRating = userFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;

    // Analyze high-rated feedback for preferred features
    const highRatedFeedback = userFeedback.filter(f => f.rating >= 4);
    const preferredFeatures = this.extractFeaturePreferences(highRatedFeedback);

    // Analyze low-rated feedback for challenges
    const lowRatedFeedback = userFeedback.filter(f => f.rating <= 2);
    const commonChallenges = this.extractChallenges(lowRatedFeedback);

    // Generate improvement suggestions
    const improvementSuggestions = this.generateUserImprovements(userFeedback);

    return {
      totalFeedback,
      averageRating,
      preferredFeatures,
      commonChallenges,
      improvementSuggestions,
    };
  }

  /**
   * Private methods
   */
  private async processFeedback(feedback: FeedbackData): Promise<void> {
    // Mark as processed
    feedback.processed = true;

    // Extract insights based on rating
    if (feedback.rating <= 2) {
      // Low rating - identify problems
      await this.analyzeLowRating(feedback);
    } else if (feedback.rating >= 4) {
      // High rating - identify successful patterns
      await this.analyzeHighRating(feedback);
    }

    // Update learning patterns
    await this.updateLearningPatterns(feedback);
  }

  private async analyzeLowRating(feedback: FeedbackData): Promise<void> {
    const improvements: string[] = [];

    // Analyze common issues
    if (feedback.feedback.toLowerCase().includes('slow')) {
      improvements.push('Consider optimizing processing speed');
    }
    
    if (feedback.feedback.toLowerCase().includes('incorrect') || feedback.feedback.toLowerCase().includes('wrong')) {
      improvements.push('Improve accuracy and validation');
    }
    
    if (feedback.feedback.toLowerCase().includes('confusing') || feedback.feedback.toLowerCase().includes('unclear')) {
      improvements.push('Enhance user interface and instructions');
    }

    feedback.improvements = improvements;
  }

  private async analyzeHighRating(feedback: FeedbackData): Promise<void> {
    // Extract successful patterns from high-rated feedback
    if (feedback.metadata.generationPrompt && feedback.metadata.executionResult === 'success') {
      const pattern: LearningPattern = {
        id: `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        pattern: this.extractSuccessPattern(feedback),
        confidence: 0.8,
        category: 'user_preference',
        examples: [{
          input: feedback.metadata.generationPrompt,
          output: feedback.metadata.generatedOutput,
          rating: feedback.rating,
          timestamp: feedback.metadata.timestamp,
        }],
        metadata: {
          userId: feedback.userId,
          feedbackType: feedback.feedbackType,
        },
      };

      this.learningPatterns.set(pattern.id, pattern);
    }
  }

  private async updateLearningPatterns(feedback: FeedbackData): Promise<void> {
    // Update existing patterns or create new ones based on feedback
    const existingPatterns = Array.from(this.learningPatterns.values());
    
    for (const pattern of existingPatterns) {
      if (this.isPatternMatch(feedback, pattern)) {
        // Update pattern confidence and examples
        pattern.examples.push({
          input: feedback.metadata.generationPrompt || '',
          output: feedback.metadata.generatedOutput,
          rating: feedback.rating,
          timestamp: feedback.metadata.timestamp,
        });

        // Recalculate confidence
        const avgRating = pattern.examples.reduce((sum, ex) => sum + ex.rating, 0) / pattern.examples.length;
        pattern.confidence = Math.min(avgRating / 5, 0.95);
      }
    }
  }

  private extractSuccessPattern(feedback: FeedbackData): string {
    const prompt = feedback.metadata.generationPrompt || '';
    
    // Simple pattern extraction - in a real system, this would be more sophisticated
    if (prompt.toLowerCase().includes('defi')) {
      return 'DeFi workflows with clear step-by-step instructions';
    } else if (prompt.toLowerCase().includes('api')) {
      return 'API integration workflows with proper error handling';
    } else if (prompt.toLowerCase().includes('notification')) {
      return 'Notification workflows with multiple channels';
    }
    
    return 'Clear, specific prompts with defined outcomes';
  }

  private isPatternMatch(feedback: FeedbackData, pattern: LearningPattern): boolean {
    // Simple pattern matching - in production, this would use more sophisticated NLP
    const prompt = feedback.metadata.generationPrompt?.toLowerCase() || '';
    const patternKeywords = pattern.pattern.toLowerCase().split(' ');
    
    return patternKeywords.some(keyword => prompt.includes(keyword));
  }

  private identifyCommonIssues(feedback: FeedbackData[]): Array<{
    category: 'prompt_quality' | 'validation_accuracy' | 'user_experience' | 'performance';
    issue: string;
    frequency: number;
    recommendation: string;
  }> {
    const issues = [];
    const feedbackText = feedback.map(f => f.feedback.toLowerCase()).join(' ');

    // Performance issues
    if (feedbackText.includes('slow') || feedbackText.includes('timeout')) {
      issues.push({
        category: 'performance' as const,
        issue: 'Performance complaints',
        frequency: (feedbackText.match(/slow|timeout/g) || []).length,
        recommendation: 'Optimize processing pipeline and implement caching',
      });
    }

    // Accuracy issues
    if (feedbackText.includes('wrong') || feedbackText.includes('incorrect')) {
      issues.push({
        category: 'validation_accuracy' as const,
        issue: 'Accuracy complaints',
        frequency: (feedbackText.match(/wrong|incorrect/g) || []).length,
        recommendation: 'Enhance validation rules and improve LLM prompts',
      });
    }

    // User experience issues
    if (feedbackText.includes('confusing') || feedbackText.includes('unclear')) {
      issues.push({
        category: 'user_experience' as const,
        issue: 'User experience complaints',
        frequency: (feedbackText.match(/confusing|unclear/g) || []).length,
        recommendation: 'Improve user interface and provide better guidance',
      });
    }

    return issues.sort((a, b) => b.frequency - a.frequency);
  }

  private extractFeaturePreferences(feedback: FeedbackData[]): string[] {
    const preferences = [];
    const feedbackText = feedback.map(f => f.feedback.toLowerCase()).join(' ');

    // Extract commonly mentioned positive features
    const features = [
      'drag and drop', 'visual editor', 'automation', 'integration',
      'templates', 'customization', 'validation', 'real-time'
    ];

    for (const feature of features) {
      if (feedbackText.includes(feature)) {
        preferences.push(feature);
      }
    }

    return preferences;
  }

  private extractChallenges(feedback: FeedbackData[]): string[] {
    const challenges = [];
    const feedbackText = feedback.map(f => f.feedback.toLowerCase()).join(' ');

    const challengePatterns = [
      'difficult to', 'hard to', 'confusing', 'unclear',
      'slow', 'error', 'bug', 'issue', 'problem'
    ];

    for (const pattern of challengePatterns) {
      if (feedbackText.includes(pattern)) {
        challenges.push(`Users find it ${pattern}`);
      }
    }

    return [...new Set(challenges)]; // Remove duplicates
  }

  private generateUserImprovements(feedback: FeedbackData[]): string[] {
    const improvements = [];
    const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

    if (avgRating < 3) {
      improvements.push('Focus on addressing core functionality issues');
    }

    const hasPerformanceComplaints = feedback.some(f => 
      f.feedback.toLowerCase().includes('slow') || f.feedback.toLowerCase().includes('timeout')
    );
    
    if (hasPerformanceComplaints) {
      improvements.push('Optimize processing speed for better user experience');
    }

    const hasAccuracyComplaints = feedback.some(f =>
      f.feedback.toLowerCase().includes('wrong') || f.feedback.toLowerCase().includes('incorrect')
    );

    if (hasAccuracyComplaints) {
      improvements.push('Improve generation accuracy and validation');
    }

    return improvements;
  }

  private async extractLearningPatterns(feedback: FeedbackData[]): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    
    // Group feedback by similarity (simplified)
    const groupedFeedback = this.groupSimilarFeedback(feedback);
    
    for (const [pattern, group] of groupedFeedback) {
      if (group.length >= 3) { // Need at least 3 examples
        const avgRating = group.reduce((sum, f) => sum + f.rating, 0) / group.length;
        
        patterns.push({
          id: `learned_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          pattern,
          confidence: Math.min(avgRating / 5, 0.9),
          category: 'prompt_optimization',
          examples: group.map(f => ({
            input: f.metadata.generationPrompt || '',
            output: f.metadata.generatedOutput,
            rating: f.rating,
            timestamp: f.metadata.timestamp,
          })),
          metadata: {
            groupSize: group.length,
            extractedAt: new Date(),
          },
        });
      }
    }
    
    return patterns;
  }

  private groupSimilarFeedback(feedback: FeedbackData[]): Map<string, FeedbackData[]> {
    // Simplified grouping - in production, use proper NLP/clustering
    const groups = new Map<string, FeedbackData[]>();
    
    for (const f of feedback) {
      const prompt = f.metadata.generationPrompt?.toLowerCase() || '';
      let groupKey = 'general';
      
      if (prompt.includes('defi') || prompt.includes('swap') || prompt.includes('token')) {
        groupKey = 'defi';
      } else if (prompt.includes('api') || prompt.includes('http') || prompt.includes('request')) {
        groupKey = 'api';
      } else if (prompt.includes('notification') || prompt.includes('alert') || prompt.includes('email')) {
        groupKey = 'notification';
      } else if (prompt.includes('data') || prompt.includes('analyze') || prompt.includes('process')) {
        groupKey = 'data_processing';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(f);
    }
    
    return groups;
  }
}