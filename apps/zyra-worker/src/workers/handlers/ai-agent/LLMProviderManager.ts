import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LLMProvider {
  name: string;
  generateText: (params: GenerateTextParams) => Promise<GenerateTextResult>;
  isHealthy: () => Promise<boolean>;
}

interface GenerateTextParams {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  maxSteps?: number;
}

interface GenerateTextResult {
  text?: string;
  content?: string;
  steps?: any[];
  toolCalls?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ProviderConfig {
  type: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

@Injectable()
export class LLMProviderManager {
  private readonly logger = new Logger(LLMProviderManager.name);
  private providers = new Map<string, LLMProvider>();

  constructor(private readonly configService: ConfigService) {
    this.initializeProviders();
  }

  async getProvider(type: string, config: ProviderConfig): Promise<LLMProvider> {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`LLM provider ${type} not found`);
    }

    // Health check
    const isHealthy = await provider.isHealthy();
    if (!isHealthy) {
      // Try fallback provider
      const fallbackProvider = await this.getFallbackProvider(type);
      if (fallbackProvider) {
        this.logger.warn(`Using fallback provider for ${type}`);
        return fallbackProvider;
      }
      throw new Error(`LLM provider ${type} is not healthy and no fallback available`);
    }

    return provider;
  }

  private initializeProviders(): void {
    // Initialize OpenRouter provider
    this.providers.set('openrouter', this.createOpenRouterProvider());
    
    // Initialize OpenAI provider
    this.providers.set('openai', this.createOpenAIProvider());
    
    // Initialize Anthropic provider
    this.providers.set('anthropic', this.createAnthropicProvider());
    
    // Initialize Ollama provider
    this.providers.set('ollama', this.createOllamaProvider());
  }

  private createOpenRouterProvider(): LLMProvider {
    return {
      name: 'openrouter',
      generateText: async (params: GenerateTextParams): Promise<GenerateTextResult> => {
        try {
          // Dynamic import to handle ES modules
          const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
          const { generateText } = await import('ai');
          
          const openrouter = createOpenRouter({
            apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
          });

          const result = await generateText({
            model: openrouter('anthropic/claude-3.5-sonnet'),
            prompt: params.prompt,
            system: params.systemPrompt,
            temperature: params.temperature || 0.7,
            maxTokens: params.maxTokens || 4000,
            tools: (params.tools || []) as any,
            maxSteps: params.maxSteps || 10,
          });

          return {
            text: result.text,
            steps: result.steps || [],
            toolCalls: this.extractToolCalls(result.steps),
            usage: result.usage ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            } : undefined,
          };

        } catch (error) {
          this.logger.error('OpenRouter provider error:', error);
          throw new Error(`OpenRouter generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      isHealthy: async (): Promise<boolean> => {
        try {
          const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
          if (!apiKey) return false;

          const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000),
          });

          return response.ok;
        } catch {
          return false;
        }
      },
    };
  }

  private createOpenAIProvider(): LLMProvider {
    return {
      name: 'openai',
      generateText: async (params: GenerateTextParams): Promise<GenerateTextResult> => {
        try {
          // Try @ai-sdk/openai first, fallback to OpenRouter if not available
          try {
            const { openai } = await import('@ai-sdk/openai');
            const { generateText } = await import('ai');

            const result = await generateText({
              model: openai('gpt-4'),
              prompt: params.prompt,
              system: params.systemPrompt,
              temperature: params.temperature || 0.7,
              maxTokens: params.maxTokens || 4000,
              tools: (params.tools || []) as any,
              maxSteps: params.maxSteps || 10,
            });

            return {
              text: result.text,
              steps: result.steps || [],
              toolCalls: this.extractToolCalls(result.steps),
              usage: result.usage ? {
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                totalTokens: result.usage.totalTokens,
              } : undefined,
            };
          } catch (importError) {
            // Fallback to OpenRouter with OpenAI models
            this.logger.warn('OpenAI SDK not available, falling back to OpenRouter');
            const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
            const { generateText } = await import('ai');
            
            const openrouter = createOpenRouter({
              apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
            });

            const result = await generateText({
              model: openrouter('openai/gpt-4'),
              prompt: params.prompt,
              system: params.systemPrompt,
              temperature: params.temperature || 0.7,
              maxTokens: params.maxTokens || 4000,
              tools: (params.tools || []) as any,
              maxSteps: params.maxSteps || 10,
            });

            return {
              text: result.text,
              steps: result.steps || [],
              toolCalls: this.extractToolCalls(result.steps),
              usage: result.usage ? {
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                totalTokens: result.usage.totalTokens,
              } : undefined,
            };
          }

        } catch (error) {
          this.logger.error('OpenAI provider error:', error);
          throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      isHealthy: async (): Promise<boolean> => {
        try {
          const apiKey = this.configService.get<string>('OPENAI_API_KEY');
          const openrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
          return !!(apiKey || openrouterKey);
        } catch {
          return false;
        }
      },
    };
  }

  private createAnthropicProvider(): LLMProvider {
    return {
      name: 'anthropic',
      generateText: async (params: GenerateTextParams): Promise<GenerateTextResult> => {
        try {
          // Always fallback to OpenRouter for Claude models since @ai-sdk/anthropic may not be available
          this.logger.debug('Using OpenRouter for Anthropic models');
          const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
          const { generateText } = await import('ai');
          
          const openrouter = createOpenRouter({
            apiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
          });

          const result = await generateText({
            model: openrouter('anthropic/claude-3.5-sonnet'),
            prompt: params.prompt,
            system: params.systemPrompt,
            temperature: params.temperature || 0.7,
            maxTokens: params.maxTokens || 4000,
            tools: (params.tools || []) as any,
            maxSteps: params.maxSteps || 10,
          });

          return {
            text: result.text,
            steps: result.steps || [],
            toolCalls: this.extractToolCalls(result.steps),
            usage: result.usage ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            } : undefined,
          };

        } catch (error) {
          this.logger.error('Anthropic provider error:', error);
          throw new Error(`Anthropic generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      isHealthy: async (): Promise<boolean> => {
        try {
          const openrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
          return !!openrouterKey;
        } catch {
          return false;
        }
      },
    };
  }

  private createOllamaProvider(): LLMProvider {
    return {
      name: 'ollama',
      generateText: async (params: GenerateTextParams): Promise<GenerateTextResult> => {
        try {
          const { ollama } = await import('ollama-ai-provider');
          const { generateText } = await import('ai');

          const result = await generateText({
            model: ollama('llama3'),
            prompt: params.prompt,
            system: params.systemPrompt,
            temperature: params.temperature || 0.7,
            maxTokens: params.maxTokens || 4000,
          });

          return {
            text: result.text,
            steps: [],
            toolCalls: [],
          };

        } catch (error) {
          this.logger.error('Ollama provider error:', error);
          throw new Error(`Ollama generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      isHealthy: async (): Promise<boolean> => {
        try {
          const ollamaUrl = this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
          const response = await fetch(`${ollamaUrl}/api/tags`, {
            signal: AbortSignal.timeout(3000),
          });
          return response.ok;
        } catch {
          return false;
        }
      },
    };
  }

  private async getFallbackProvider(primaryType: string): Promise<LLMProvider | null> {
    const fallbackOrder = {
      'openrouter': ['openai', 'anthropic'],
      'openai': ['openrouter', 'anthropic'],
      'anthropic': ['openrouter', 'openai'],
      'ollama': ['openrouter'],
    };

    const fallbacks = fallbackOrder[primaryType] || [];
    
    for (const fallbackType of fallbacks) {
      const provider = this.providers.get(fallbackType);
      if (provider && await provider.isHealthy()) {
        return provider;
      }
    }

    return null;
  }

  private extractToolCalls(steps: any[] = []): any[] {
    const toolCalls = [];
    
    for (const step of steps) {
      if (step.toolCalls) {
        toolCalls.push(...step.toolCalls);
      }
    }

    return toolCalls;
  }
}