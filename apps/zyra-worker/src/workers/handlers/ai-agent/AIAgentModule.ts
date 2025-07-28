import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../services/database.service';
import { ExecutionLogger } from '../../execution-logger';

import { AIAgentHandler } from '../AIAgentHandler';
import { LLMProviderManager } from './LLMProviderManager';
import { MCPServerManager } from './MCPServerManager';
import { SecurityValidator } from './SecurityValidator';
import { ReasoningEngine } from './ReasoningEngine';
import { GOATManager } from './GOATManager';

/**
 * AI Agent Module for dependency injection
 * Provides all AI Agent related services and handlers
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Core managers
    {
      provide: LLMProviderManager,
      useFactory: (configService) => new LLMProviderManager(configService),
      inject: ['ConfigService'],
    },
    {
      provide: MCPServerManager,
      useFactory: (databaseService) => new MCPServerManager(databaseService),
      inject: [DatabaseService],
    },
    {
      provide: SecurityValidator,
      useFactory: (databaseService) => new SecurityValidator(databaseService),
      inject: [DatabaseService],
    },
    {
      provide: ReasoningEngine,
      useFactory: (databaseService) => new ReasoningEngine(databaseService),
      inject: [DatabaseService],
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
      ) => new AIAgentHandler(
        databaseService,
        executionLogger,
        llmProviderManager,
        mcpServerManager,
        securityValidator,
        reasoningEngine,
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
  ],
})
export class AIAgentModule {}