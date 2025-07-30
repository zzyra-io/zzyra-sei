import { Module } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { CodeGenerationService } from '../services/ai/code-generation.service';

/**
 * AI module for handling code generation and AI-driven features
 *
 * This module manages services related to AI capabilities:
 * - Code generation for dynamic execution of DeFi blocks
 * - Learning from successful execution patterns
 * - Integration with OpenAI/OpenRouter APIs
 */
@Module({
  providers: [
    // Core logger
    { provide: Logger, useValue: new Logger('AIModule') },

    // AI services
    CodeGenerationService,
  ],
  exports: [
    // Export AI services for use by other modules
    CodeGenerationService,
  ],
})
export class AIModule {}
