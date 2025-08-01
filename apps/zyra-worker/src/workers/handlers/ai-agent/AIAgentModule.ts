import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../services/database.service';
import { ExecutionLogger } from '../../execution-logger';

import { AIAgentHandler } from '../AIAgentHandler';
import { LLMProviderManager } from './LLMProviderManager';
import { MCPServerManager } from './MCPServerManager';
import { SecurityValidator } from './SecurityValidator';
import { ReasoningEngine } from './ReasoningEngine';
import { SubscriptionService } from './SubscriptionService';
import { GOATManager } from './GOATManager';
import { CacheService } from './CacheService';
import { ToolAnalyticsService } from './ToolAnalyticsService';
import { ExecutionHistoryService } from './ExecutionHistoryService';
import { ToolDiscoveryService } from './ToolDiscoveryService';
import { ThinkingModeService } from './ThinkingModeService';
import { AIAgentEnhancementsAPI } from './AIAgentEnhancementsAPI';

/**
 * AI Agent Module for dependency injection
 * Provides all AI Agent related services and handlers
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Core services
    {
      provide: CacheService,
      useFactory: (configService) => new CacheService(configService),
      inject: ['ConfigService'],
    },
    {
      provide: ToolAnalyticsService,
      useFactory: (databaseService, cacheService) =>
        new ToolAnalyticsService(databaseService, cacheService),
      inject: [DatabaseService, CacheService],
    },
    {
      provide: ExecutionHistoryService,
      useFactory: (databaseService, cacheService) =>
        new ExecutionHistoryService(databaseService, cacheService),
      inject: [DatabaseService, CacheService],
    },
    {
      provide: ToolDiscoveryService,
      useFactory: (databaseService, cacheService, toolAnalyticsService) =>
        new ToolDiscoveryService(
          databaseService,
          cacheService,
          toolAnalyticsService,
          new (require('../goat/GoatPluginManager').GoatPluginManager)(),
        ),
      inject: [DatabaseService, CacheService, ToolAnalyticsService],
    },
    {
      provide: ThinkingModeService,
      useFactory: (databaseService, subscriptionService, cacheService) =>
        new ThinkingModeService(
          databaseService,
          subscriptionService,
          cacheService,
        ),
      inject: [DatabaseService, SubscriptionService, CacheService],
    },

    // Unified API service
    {
      provide: AIAgentEnhancementsAPI,
      useFactory: (
        cacheService,
        toolAnalyticsService,
        executionHistoryService,
        toolDiscoveryService,
        thinkingModeService,
        llmProviderManager,
      ) =>
        new AIAgentEnhancementsAPI(
          cacheService,
          toolAnalyticsService,
          executionHistoryService,
          toolDiscoveryService,
          thinkingModeService,
          llmProviderManager,
        ),
      inject: [
        CacheService,
        ToolAnalyticsService,
        ExecutionHistoryService,
        ToolDiscoveryService,
        ThinkingModeService,
        LLMProviderManager,
      ],
    },

    // Core managers
    {
      provide: LLMProviderManager,
      useFactory: (configService, cacheService) =>
        new LLMProviderManager(configService, cacheService),
      inject: ['ConfigService', CacheService],
    },
    {
      provide: MCPServerManager,
      useFactory: (databaseService, cacheService) =>
        new MCPServerManager(databaseService, cacheService),
      inject: [DatabaseService, CacheService],
    },
    {
      provide: SecurityValidator,
      useFactory: (databaseService) => new SecurityValidator(databaseService),
      inject: [DatabaseService],
    },
    {
      provide: SubscriptionService,
      useFactory: () => new SubscriptionService(),
      inject: [],
    },
    {
      provide: ReasoningEngine,
      useFactory: (
        databaseService,
        subscriptionService,
        toolAnalyticsService,
        cacheService,
      ) =>
        new ReasoningEngine(
          databaseService,
          subscriptionService,
          toolAnalyticsService,
          cacheService,
        ),
      inject: [
        DatabaseService,
        SubscriptionService,
        ToolAnalyticsService,
        CacheService,
      ],
    },
    {
      provide: GOATManager,
      useFactory: (configService) => new GOATManager(configService),
      inject: ['ConfigService'],
    },

    // Main AI Agent Handler
    {
      provide: AIAgentHandler,
      useFactory: (
        databaseService: DatabaseService,
        executionLogger: ExecutionLogger,
        llmProviderManager: LLMProviderManager,
        mcpServerManager: MCPServerManager,
        securityValidator: SecurityValidator,
        reasoningEngine: ReasoningEngine,
      ) =>
        new AIAgentHandler(
          databaseService,
          executionLogger,
          llmProviderManager,
          mcpServerManager,
          securityValidator,
          reasoningEngine,
          new (require('./EnhancedReasoningEngine').EnhancedReasoningEngine)(),
          new (require('../goat/GoatPluginManager').GoatPluginManager)(),
        ),
      inject: [
        DatabaseService,
        ExecutionLogger,
        LLMProviderManager,
        MCPServerManager,
        SecurityValidator,
        ReasoningEngine,
      ],
    },
  ],
  exports: [
    AIAgentHandler,
    LLMProviderManager,
    MCPServerManager,
    SecurityValidator,
    ReasoningEngine,
    GOATManager,
    CacheService,
    ToolAnalyticsService,
    ExecutionHistoryService,
    ToolDiscoveryService,
    ThinkingModeService,
    AIAgentEnhancementsAPI,
  ],
})
export class AIAgentModule {}
