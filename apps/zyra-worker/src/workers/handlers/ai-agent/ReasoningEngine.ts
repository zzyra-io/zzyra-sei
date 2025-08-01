import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { SubscriptionService } from './SubscriptionService';
import { ToolAnalyticsService } from './ToolAnalyticsService';
import { CacheService } from './CacheService';

interface ThinkingStep {
  step: number;
  type:
    | 'planning'
    | 'reasoning'
    | 'tool_selection'
    | 'execution'
    | 'reflection';
  reasoning: string;
  confidence: number;
  toolsConsidered?: string[];
  decision?: string;
  timestamp: string;
}

interface ReasoningParams {
  prompt: string;
  systemPrompt: string;
  provider: any;
  tools: any[];
  maxSteps: number;
  thinkingMode: 'fast' | 'deliberate' | 'collaborative';
  sessionId: string;
  userId?: string;
}

interface ReasoningResult {
  text: string;
  steps: ThinkingStep[];
  toolCalls: any[];
  confidence: number;
  executionPath: string[];
  error?: string;
}

@Injectable()
export class ReasoningEngine {
  private readonly logger = new Logger(ReasoningEngine.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly subscriptionService: SubscriptionService,
    private readonly toolAnalyticsService: ToolAnalyticsService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(params: ReasoningParams): Promise<ReasoningResult> {
    const steps: ThinkingStep[] = [];
    const toolCalls: any[] = [];
    let currentStep = 1;

    // Input validation and sanitization
    if (!params) {
      throw new Error('ReasoningParams is required');
    }

    if (!params.prompt || typeof params.prompt !== 'string') {
      throw new Error('Valid prompt is required');
    }

    if (!params.provider) {
      throw new Error('LLM provider is required');
    }

    // **CACHE OPTIMIZATION**: Warm up cache for this user
    if (params.userId) {
      try {
        await this.cacheService.warmupCache(params.userId);
        this.logger.debug(`Cache warmed up for user: ${params.userId}`);
      } catch (warmupError) {
        this.logger.warn('Cache warmup failed:', warmupError);
      }
    }

    // Sanitize user prompt to prevent injection
    params.prompt = this.sanitizePrompt(params.prompt);

    // Set safe defaults
    params.thinkingMode = params.thinkingMode || 'fast';
    params.maxSteps = Math.min(params.maxSteps || 10, 50); // Cap at 50 steps
    params.tools = Array.isArray(params.tools) ? params.tools.slice(0, 20) : []; // Limit tools

    try {
      // Check subscription for advanced thinking modes with timeout
      if (params.userId && params.thinkingMode !== 'fast') {
        try {
          const canUseAdvanced = await Promise.race([
            this.subscriptionService.canUseAdvancedThinking(params.userId),
            new Promise<boolean>((_, reject) =>
              setTimeout(
                () => reject(new Error('Subscription check timeout')),
                5000,
              ),
            ),
          ]);

          if (!canUseAdvanced) {
            this.logger.warn(
              `User ${params.userId} attempted to use ${params.thinkingMode} thinking without subscription`,
            );
            params.thinkingMode = 'fast'; // Fallback to fast thinking
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Subscription check failed: ${errorMessage}`);
          params.thinkingMode = 'fast'; // Safe fallback
        }
      }

      // Step 1: Planning (always generate for debugging)
      const planningStep = await this.planExecution(params, currentStep++);
      steps.push(planningStep);

      // Step 2: Initial reasoning step
      const reasoningStep: ThinkingStep = {
        step: currentStep++,
        type: 'reasoning',
        reasoning: `Analyzing user request: "${params.prompt.substring(0, 100)}..." with ${params.tools.length} available tools.`,
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      };
      steps.push(reasoningStep);

      // Step 3: Tool Selection
      if (params.tools.length > 0) {
        const toolSelectionStep = await this.selectTools(params, currentStep++);
        steps.push(toolSelectionStep);
      }

      // Step 4: Execute with provider
      const executionResult = await this.executeWithProvider(params, steps);

      // Extract tool calls from execution
      if (executionResult.toolCalls) {
        toolCalls.push(...executionResult.toolCalls);
      }

      // Step 5: Post-execution analysis (always add for debugging)
      const postExecutionStep: ThinkingStep = {
        step: currentStep++,
        type: 'execution',
        reasoning: `Execution completed. Generated response with ${toolCalls.length} tool calls. Result confidence: ${this.calculateOverallConfidence([...steps])}`,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      };
      steps.push(postExecutionStep);

      // Step 6: Reflection (if deliberate mode and user has access)
      if (params.thinkingMode === 'deliberate' && params.userId) {
        try {
          const canUseDeliberate =
            await this.subscriptionService.canUseDeliberateThinking(
              params.userId,
            );
          if (canUseDeliberate) {
            const reflectionStep = await this.reflect(
              executionResult,
              currentStep++,
            );
            steps.push(reflectionStep);
          } else {
            this.logger.warn(
              `User ${params.userId} attempted deliberate thinking without subscription`,
            );
          }
        } catch (error) {
          this.logger.warn(
            'Failed to check deliberate thinking subscription, skipping reflection',
          );
        }
      }

      // Save thinking process
      await this.saveThinkingProcess(params.sessionId, steps);

      // **CACHE OPTIMIZATION**: Cache the complete reasoning session
      if (steps.length > 0) {
        try {
          const completeCacheKey = {
            prompt: params.prompt,
            systemPrompt: params.systemPrompt,
            provider: params.provider.constructor.name || 'unknown',
            model: params.provider.modelName || 'unknown',
            thinkingMode: params.thinkingMode,
          };
          await this.cacheService.cacheReasoningSteps(completeCacheKey, steps);
          this.logger.debug('Cached complete reasoning session');
        } catch (cacheError) {
          this.logger.warn('Failed to cache reasoning session:', cacheError);
        }
      }

      return {
        text:
          executionResult.text ||
          executionResult.content ||
          'No response generated',
        steps,
        toolCalls,
        confidence: this.calculateOverallConfidence(steps),
        executionPath: steps.map((s) => s.type),
      };
    } catch (error) {
      this.logger.error('Reasoning engine execution failed:', error);

      // Add error step with safe error message
      const errorMessage =
        error instanceof Error
          ? error.message.slice(0, 500) // Limit error message length
          : 'Unknown execution error';

      steps.push({
        step: currentStep,
        type: 'execution',
        reasoning: `Execution failed: ${errorMessage}`,
        confidence: 0,
        timestamp: new Date().toISOString(),
      });

      // Save thinking process even on failure
      try {
        await this.saveThinkingProcess(params.sessionId, steps);
      } catch (saveError) {
        this.logger.error(
          'Failed to save thinking process on error:',
          saveError,
        );
      }

      // Return graceful failure instead of throwing
      return {
        text: `I encountered an error while processing your request: ${errorMessage}`,
        steps,
        toolCalls,
        confidence: 0,
        executionPath: steps.map((s) => s.type),
        error: errorMessage,
      };
    }
  }

  private async planExecution(
    params: ReasoningParams,
    stepNumber: number,
  ): Promise<ThinkingStep> {
    // **CACHE OPTIMIZATION**: Check for cached planning results
    const planningCacheKey = {
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      provider: params.provider.constructor.name || 'unknown',
      model: params.provider.modelName || 'unknown',
      thinkingMode: params.thinkingMode,
    };

    // Try to get cached planning result
    const cachedPlanning =
      await this.cacheService.getCachedReasoningSteps(planningCacheKey);
    if (cachedPlanning && cachedPlanning.length > 0) {
      const cachedStep = cachedPlanning.find(
        (step) => step.type === 'planning',
      );
      if (cachedStep) {
        this.logger.debug('Using cached planning result');
        return {
          ...cachedStep,
          step: stepNumber,
          timestamp: new Date().toISOString(),
        };
      }
    }

    const planningPrompt = this.buildPlanningPrompt(params);

    try {
      const planningResult = await params.provider.generateText({
        prompt: planningPrompt,
        systemPrompt:
          'You are a planning assistant. Create a step-by-step plan.',
        temperature: 0.3,
        maxTokens: 500,
      });

      const plan = planningResult.text || planningResult.content;
      const confidence = this.assessPlanConfidence(plan);

      const planningStep = {
        step: stepNumber,
        type: 'planning' as const,
        reasoning: plan,
        confidence,
        timestamp: new Date().toISOString(),
      };

      // **CACHE OPTIMIZATION**: Cache the planning result
      try {
        await this.cacheService.cacheReasoningSteps(planningCacheKey, [
          planningStep,
        ]);
        this.logger.debug('Cached planning result for future use');
      } catch (cacheError) {
        this.logger.warn('Failed to cache planning result:', cacheError);
      }

      return planningStep;
    } catch (error) {
      this.logger.warn('Planning step failed, using fallback:', error);

      return {
        step: stepNumber,
        type: 'planning',
        reasoning: 'Using direct execution approach due to planning failure.',
        confidence: 0.5,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async selectTools(
    params: ReasoningParams,
    stepNumber: number,
  ): Promise<ThinkingStep> {
    this.logger.log(
      `Selecting tools from ${params.tools.length} available tools`,
    );
    this.logger.log(
      `Available tools: ${params.tools.map((t) => t.name).join(', ')}`,
    );

    // **CACHE OPTIMIZATION**: Create cache key for tool selection
    const toolSelectionCacheKey = {
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      provider: params.provider.constructor.name || 'unknown',
      model: params.provider.modelName || 'unknown',
      thinkingMode:
        params.thinkingMode +
        '_tools_' +
        params.tools
          .map((t) => t.id)
          .sort()
          .join(','),
    };

    // Try to get cached tool selection result
    const cachedToolSelection = await this.cacheService.getCachedReasoningSteps(
      toolSelectionCacheKey,
    );
    if (cachedToolSelection && cachedToolSelection.length > 0) {
      const cachedStep = cachedToolSelection.find(
        (step) => step.type === 'tool_selection',
      );
      if (cachedStep) {
        this.logger.debug('Using cached tool selection result');
        return {
          ...cachedStep,
          step: stepNumber,
          timestamp: new Date().toISOString(),
        };
      }
    }

    const availableTools = params.tools.map((tool) => ({
      id: tool.id,
      name: tool.id, // Use id as name since we're using simple names
      description: tool.description,
    }));

    const toolSelectionPrompt = this.buildToolSelectionPrompt(
      params.prompt,
      availableTools,
    );

    try {
      const selectionResult = await params.provider.generateText({
        prompt: toolSelectionPrompt,
        systemPrompt:
          'You are a tool selection assistant. Choose the most appropriate tools.',
        temperature: 0.2,
        maxTokens: 300,
      });

      const reasoning = selectionResult.text || selectionResult.content;
      const selectedTools = this.extractSelectedTools(
        reasoning,
        availableTools,
      );

      const toolSelectionStep = {
        step: stepNumber,
        type: 'tool_selection' as const,
        reasoning,
        confidence: selectedTools.length > 0 ? 0.8 : 0.3,
        toolsConsidered: availableTools.map((t) => t.name),
        decision: `Selected tools: ${selectedTools.join(', ')}`,
        timestamp: new Date().toISOString(),
      };

      // **CACHE OPTIMIZATION**: Cache the tool selection result
      try {
        await this.cacheService.cacheReasoningSteps(toolSelectionCacheKey, [
          toolSelectionStep,
        ]);
        this.logger.debug('Cached tool selection result for future use');
      } catch (cacheError) {
        this.logger.warn('Failed to cache tool selection result:', cacheError);
      }

      return toolSelectionStep;
    } catch (error) {
      this.logger.warn('Tool selection failed:', error);

      return {
        step: stepNumber,
        type: 'tool_selection',
        reasoning:
          'Tool selection failed, proceeding with all available tools.',
        confidence: 0.4,
        toolsConsidered: availableTools.map((t) => t.name),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async executeWithProvider(
    params: ReasoningParams,
    previousSteps: ThinkingStep[],
  ): Promise<any> {
    const context = this.buildExecutionContext(previousSteps);
    const enhancedPrompt = `${context}\n\nUser Request: ${params.prompt}`;

    // Get the execution result from LLM
    const result = await params.provider.generateText({
      prompt: enhancedPrompt,
      systemPrompt: params.systemPrompt,
      maxSteps: params.maxSteps,
      temperature: params.thinkingMode === 'fast' ? 0.7 : 0.5,
    });

    // Check if any tools were selected in previous steps
    const toolSelectionStep = previousSteps.find(
      (step) => step.type === 'tool_selection',
    );
    if (toolSelectionStep && toolSelectionStep.decision) {
      const selectedTools = this.extractSelectedTools(
        toolSelectionStep.reasoning,
        params.tools,
      );

      if (selectedTools.length > 0) {
        this.logger.log(
          `Executing selected tools: ${selectedTools.map((t) => t.name).join(', ')}`,
        );

        // Execute tools with chaining support
        const toolResults = await this.executeToolsWithChaining(
          selectedTools,
          params,
        );

        // Process tool results and generate final response
        const finalResponse = await this.generateFinalResponse(
          params.prompt,
          result.text || result.content,
          toolResults,
          params.provider,
          params.systemPrompt,
        );

        return {
          text: finalResponse,
          toolCalls: toolResults,
          steps: result.steps || [],
        };
      }
    }

    return {
      text: result.text || result.content,
      toolCalls: [],
      steps: result.steps || [],
    };
  }

  /**
   * Execute tools with chaining support - use results from previous tools as inputs to subsequent tools
   */
  private async executeToolsWithChaining(
    selectedTools: { name: string; parameters?: any }[],
    params: ReasoningParams,
  ): Promise<any[]> {
    const toolResults = [];
    const previousResults = new Map<string, any>();

    for (let i = 0; i < selectedTools.length; i++) {
      const toolEntry = selectedTools[i];
      const tool = params.tools.find((t) => t.id === toolEntry.name);

      if (!tool || !tool.execute) {
        this.logger.warn(`Tool not found or not executable: ${toolEntry.name}`);
        continue;
      }

      const startTime = Date.now();

      try {
        // Enhance parameters with results from previous tools using semantic intelligence
        const enhancedParameters =
          await this.enhanceParametersWithPreviousResults(
            toolEntry.parameters || {},
            previousResults,
            tool,
            toolEntry.name,
            params.prompt, // Pass conversation context
          );

        this.logger.log(
          `Executing tool: ${toolEntry.name} with parameters:`,
          enhancedParameters,
        );

        // Check cache first
        const cacheKey = {
          toolName: toolEntry.name,
          parameters: enhancedParameters,
          userId: params.userId || 'anonymous',
        };

        let toolResult = await this.cacheService.getCachedToolResult(cacheKey);
        const fromCache = !!toolResult;

        if (!toolResult) {
          toolResult = await tool.execute(enhancedParameters);
          // Cache successful results
          await this.cacheService.cacheToolResult(cacheKey, toolResult);
        }

        const responseTime = Date.now() - startTime;
        const resultEntry = {
          tool: toolEntry.name,
          result: toolResult,
          fromCache,
          responseTime,
          parameters: enhancedParameters,
        };

        toolResults.push(resultEntry);

        // Store result for potential use by subsequent tools
        previousResults.set(toolEntry.name, toolResult);

        // Record analytics
        this.toolAnalyticsService.recordToolUsage({
          toolName: toolEntry.name,
          userId: params.userId || 'anonymous',
          sessionId: params.sessionId,
          executionId: params.sessionId,
          parameters: enhancedParameters,
          result: toolResult,
          success: true,
          responseTime,
          context: {
            provider: 'unknown',
            model: 'unknown',
            thinkingMode: params.thinkingMode,
            promptHash: this.hashString(params.prompt),
          },
        });
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Tool execution failed for ${toolEntry.name}:`,
          error,
        );

        toolResults.push({
          tool: toolEntry.name,
          error: errorMessage,
          responseTime,
          parameters: toolEntry.parameters || {},
        });

        // Record failed analytics
        this.toolAnalyticsService.recordToolUsage({
          toolName: toolEntry.name,
          userId: params.userId || 'anonymous',
          sessionId: params.sessionId,
          executionId: params.sessionId,
          parameters: toolEntry.parameters || {},
          result: null,
          success: false,
          error: errorMessage,
          responseTime,
          context: {
            provider: 'unknown',
            model: 'unknown',
            thinkingMode: params.thinkingMode,
            promptHash: this.hashString(params.prompt),
          },
        });
      }
    }

    return toolResults;
  }

  /**
   * Enhance parameters with results from previous tool executions
   */
  /**
   * Dynamically enhance parameters with semantic intelligence (with caching)
   */
  private async enhanceParametersWithPreviousResults(
    originalParameters: any,
    previousResults: Map<string, any>,
    tool: any,
    toolName: string,
    conversationContext: string = '',
  ): Promise<any> {
    // **CACHE OPTIMIZATION**: Create cache key for parameter enhancement
    const enhancementCacheKey = {
      toolName,
      parameters: originalParameters,
      userId: 'system', // Could be passed as parameter
    };

    // Try to get cached enhancement result
    const cachedEnhancement =
      await this.cacheService.getCachedToolResult(enhancementCacheKey);
    if (cachedEnhancement) {
      this.logger.debug(`Using cached parameter enhancement for ${toolName}`);
      return cachedEnhancement;
    }

    const enhancedParameters = { ...originalParameters };

    // If this tool needs parameters that might come from previous tools
    if (tool.inputSchema?.properties) {
      for (const [paramName, paramSchema] of Object.entries(
        tool.inputSchema.properties,
      )) {
        const schema = paramSchema as any;
        const currentValue = originalParameters[paramName];

        // Use semantic analysis to determine if parameter needs enhancement
        const needsEnhancement = this.shouldEnhanceParameter(
          paramName,
          currentValue,
          schema,
          conversationContext,
        );

        if (needsEnhancement) {
          let enhancedValue = null;

          // First try to extract from previous results
          if (previousResults.size > 0) {
            enhancedValue = this.extractValueFromPreviousResults(
              paramName,
              schema,
              previousResults,
              toolName,
              conversationContext,
            );
          }

          // If no value found in previous results, generate intelligently
          if (enhancedValue === null) {
            enhancedValue = this.generateIntelligentDefault(
              paramName,
              schema,
              conversationContext,
            );
          }

          // Apply the enhancement if we got a valid value
          if (enhancedValue !== null) {
            enhancedParameters[paramName] = enhancedValue;
            this.logger.log(
              `Semantically enhanced parameter ${paramName}: ${enhancedValue}`,
            );
          }
        }
      }
    }

    // **CACHE OPTIMIZATION**: Cache the enhanced parameters result
    try {
      const finalCacheKey = {
        toolName,
        parameters: enhancedParameters,
        userId: 'system',
      };
      await this.cacheService.cacheToolResult(
        finalCacheKey,
        enhancedParameters,
      );
      this.logger.debug(`Cached parameter enhancement for ${toolName}`);
    } catch (cacheError) {
      this.logger.warn('Failed to cache parameter enhancement:', cacheError);
    }

    return enhancedParameters;
  }

  /**
   * Semantic decision on whether a parameter needs enhancement
   */
  private shouldEnhanceParameter(
    paramName: string,
    currentValue: any,
    paramSchema: any,
    conversationContext: string,
  ): boolean {
    // Quick checks for obvious cases
    if (
      currentValue === undefined ||
      currentValue === null ||
      currentValue === '' ||
      currentValue === 'placeholder' ||
      currentValue === 'default_value'
    ) {
      return true;
    }

    // Use semantic validation for nuanced decisions
    if (typeof currentValue === 'string') {
      return !this.isValidParameterValue(
        currentValue,
        paramName,
        paramSchema,
        conversationContext,
      );
    }

    return false;
  }

  /**
   * Dynamically extract value from previous tool results using semantic intelligence
   */
  private extractValueFromPreviousResults(
    paramName: string,
    paramSchema: any,
    previousResults: Map<string, any>,
    currentToolName: string,
    conversationContext: string = '',
  ): any {
    if (previousResults.size === 0) {
      return null;
    }

    return this.extractParameterSemantically(
      paramName,
      paramSchema,
      previousResults,
      currentToolName,
      conversationContext,
    );
  }

  /**
   * Semantic parameter extraction from previous results
   */
  private extractParameterSemantically(
    paramName: string,
    paramSchema: any,
    previousResults: Map<string, any>,
    currentToolName: string,
    conversationContext: string,
  ): any {
    const paramNameLower = paramName.toLowerCase();
    const paramType = paramSchema?.type || 'string';

    // Try semantic extraction patterns
    for (const [toolName, result] of previousResults.entries()) {
      const extractedValue = this.extractBySemanticPattern(
        paramNameLower,
        paramType,
        result,
        toolName,
        conversationContext,
      );

      if (
        extractedValue !== null &&
        this.isValidParameterValue(
          extractedValue,
          paramName,
          paramSchema,
          conversationContext,
        )
      ) {
        this.logger.log(
          `Extracted ${paramName} from ${toolName}: ${extractedValue}`,
        );
        return extractedValue;
      }
    }

    return null;
  }

  /**
   * Extract parameter using semantic pattern matching
   */
  private extractBySemanticPattern(
    paramNameLower: string,
    paramType: string,
    result: any,
    toolName: string,
    conversationContext: string,
  ): any {
    if (!result?.result) return null;

    // Get result text
    const resultText = this.getResultText(result);
    if (!resultText) return null;

    // Skip error results
    if (this.isErrorMessage(resultText)) return null;

    // Address extraction patterns
    if (
      paramNameLower.includes('address') ||
      paramNameLower.includes('wallet')
    ) {
      return this.extractAddressFromResult(resultText);
    }

    // Chain ID extraction patterns
    if (
      paramNameLower.includes('chain') ||
      paramNameLower.includes('network')
    ) {
      return this.extractChainFromResult(resultText);
    }

    // Block extraction patterns
    if (
      paramNameLower.includes('block') &&
      (paramNameLower.includes('number') || paramNameLower.includes('hash'))
    ) {
      return this.extractBlockFromResult(resultText);
    }

    // Token/balance extraction patterns
    if (
      paramNameLower.includes('token') ||
      paramNameLower.includes('balance') ||
      paramNameLower.includes('amount')
    ) {
      return this.extractTokenInfoFromResult(resultText, paramNameLower);
    }

    // Transaction hash extraction
    if (
      paramNameLower.includes('transaction') ||
      paramNameLower.includes('tx')
    ) {
      return this.extractTransactionFromResult(resultText);
    }

    // Boolean extraction from result context
    if (paramType === 'boolean') {
      return this.extractBooleanFromResult(resultText, paramNameLower);
    }

    // Generic text extraction for string parameters
    if (paramType === 'string') {
      return this.extractStringFromResult(resultText, paramNameLower);
    }

    return null;
  }

  /**
   * Get text content from result object
   */
  private getResultText(result: any): string | null {
    if (!result?.result) return null;

    if (Array.isArray(result.result)) {
      const textResults = result.result
        .map((r) => r.text || JSON.stringify(r))
        .filter((text) => text && !this.isErrorMessage(text))
        .join(' ');
      return textResults || null;
    }

    if (typeof result.result === 'string') {
      return result.result;
    }

    if (typeof result.result === 'object') {
      return JSON.stringify(result.result);
    }

    return null;
  }

  /**
   * Extract blockchain addresses from result text
   */
  private extractAddressFromResult(text: string): string | null {
    // Ethereum addresses
    const ethMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (ethMatch) return ethMatch[0];

    // Sei addresses
    const seiMatch = text.match(/sei1[a-z0-9]{38,58}/);
    if (seiMatch) return seiMatch[0];

    return null;
  }

  /**
   * Extract chain information from result text
   */
  private extractChainFromResult(text: string): string | null {
    const textLower = text.toLowerCase();

    // Look for chain mentions
    if (textLower.includes('ethereum') || textLower.includes('mainnet'))
      return '1';
    if (textLower.includes('polygon')) return '137';
    if (textLower.includes('bsc') || textLower.includes('binance')) return '56';

    // Look for numeric chain IDs
    const chainMatch = text.match(/"chain_id":\s*"?(\d+)"?/);
    if (chainMatch) return chainMatch[1];

    return null;
  }

  /**
   * Extract block information from result text
   */
  private extractBlockFromResult(text: string): string | null {
    // Block hash
    const hashMatch = text.match(/0x[a-fA-F0-9]{64}/);
    if (hashMatch) return hashMatch[0];

    // Block number
    const numberMatch = text.match(/"block_number":\s*"?(\d+)"?/);
    if (numberMatch) return numberMatch[1];

    return null;
  }

  /**
   * Extract token information from result text
   */
  private extractTokenInfoFromResult(
    text: string,
    paramName: string,
  ): string | null {
    // Token symbols
    if (paramName.includes('symbol') || paramName.includes('token')) {
      const symbolMatch = text.match(
        /\b(ETH|BTC|USDC|USDT|DAI|WETH|MATIC|BNB|ARB|SEI)\b/i,
      );
      if (symbolMatch) return symbolMatch[0].toUpperCase();
    }

    // Balance amounts
    if (paramName.includes('balance') || paramName.includes('amount')) {
      const balanceMatch = text.match(/"balance":\s*"?(\d+(?:\.\d+)?)"?/);
      if (balanceMatch) return balanceMatch[1];
    }

    return null;
  }

  /**
   * Extract transaction information from result text
   */
  private extractTransactionFromResult(text: string): string | null {
    // Transaction hash
    const txMatch = text.match(/0x[a-fA-F0-9]{64}/);
    if (txMatch) return txMatch[0];

    return null;
  }

  /**
   * Extract boolean values from result context
   */
  private extractBooleanFromResult(
    text: string,
    paramName: string,
  ): boolean | null {
    const textLower = text.toLowerCase();

    if (paramName.includes('include') || paramName.includes('show')) {
      return (
        textLower.includes('true') ||
        textLower.includes('yes') ||
        textLower.includes('enabled')
      );
    }

    return null;
  }

  /**
   * Extract string values from result
   */
  private extractStringFromResult(
    text: string,
    paramName: string,
  ): string | null {
    // Don't return the entire result text - be selective
    if (text.length > 100) return null;

    // Clean up the text
    const cleanText = text.replace(/["{}\[\]]/g, '').trim();

    if (cleanText.length > 0 && cleanText.length < 100) {
      return cleanText;
    }

    return null;
  }

  /**
   * AI-driven parameter extraction from previous results
   */
  private async extractParameterWithAI(
    paramName: string,
    paramSchema: any,
    previousResults: Map<string, any>,
    currentToolName: string,
    conversationContext: string,
    provider: any,
  ): Promise<any> {
    const extractionPrompt = this.buildParameterExtractionPrompt(
      paramName,
      paramSchema,
      previousResults,
      currentToolName,
      conversationContext,
    );

    const response = await provider.generateText({
      prompt: extractionPrompt,
      maxTokens: 250,
      temperature: 0.1, // Very low temperature for precise extraction
    });

    return this.parseAIExtractedParameter(response, paramSchema);
  }

  /**
   * Build dynamic parameter extraction prompt
   */
  private buildParameterExtractionPrompt(
    paramName: string,
    paramSchema: any,
    previousResults: Map<string, any>,
    currentToolName: string,
    conversationContext: string,
  ): string {
    let resultsContext = '';
    let resultIndex = 1;

    for (const [toolName, result] of previousResults.entries()) {
      if (result?.result) {
        const resultText = Array.isArray(result.result)
          ? result.result.map((r) => r.text || JSON.stringify(r)).join(' ')
          : JSON.stringify(result.result);
        resultsContext += `\n${resultIndex}. ${toolName}: ${resultText.slice(0, 200)}...`;
        resultIndex++;
      }
    }

    return `As an AI parameter extractor, find the most appropriate value for this parameter from previous tool results.

PARAMETER TO EXTRACT:
- Name: ${paramName}
- Type: ${paramSchema?.type || 'unknown'}
- Description: ${paramSchema?.description || 'No description'}
- For tool: ${currentToolName}

PREVIOUS TOOL RESULTS:${resultsContext}

CONVERSATION CONTEXT: ${conversationContext.slice(-300)}

EXTRACTION RULES:
1. Look for exact matches to the parameter name first
2. Look for semantically related values (e.g., wallet addresses for "address" parameter)
3. Ignore error messages, validation errors, and placeholder values
4. Return the most relevant, actual data value
5. Consider the tool context - what would this parameter logically need?

RESPONSE FORMAT:
If you found a value: "EXTRACTED: [the actual value]"
If no relevant value found: "NOT_FOUND: [brief reason]"
If multiple candidates: "BEST_MATCH: [the best value] - [reason]"

Extract the parameter:`;
  }

  /**
   * Parse AI-extracted parameter response
   */
  private parseAIExtractedParameter(response: string, paramSchema: any): any {
    const trimmedResponse = response.trim();

    if (trimmedResponse.startsWith('EXTRACTED:')) {
      const value = trimmedResponse.replace('EXTRACTED:', '').trim();
      return this.convertValueToParameterType(value, paramSchema);
    }

    if (trimmedResponse.startsWith('BEST_MATCH:')) {
      const value = trimmedResponse
        .replace('BEST_MATCH:', '')
        .split(' - ')[0]
        .trim();
      return this.convertValueToParameterType(value, paramSchema);
    }

    if (trimmedResponse.startsWith('NOT_FOUND:')) {
      return null;
    }

    // Fallback: try to extract value from the entire response
    return this.convertValueToParameterType(trimmedResponse, paramSchema);
  }

  /**
   * Fallback parameter extraction when AI fails
   */
  private fallbackParameterExtraction(
    paramName: string,
    paramSchema: any,
    previousResults: Map<string, any>,
  ): any {
    // Simple fallback: look for obvious matches
    for (const [toolName, result] of previousResults.entries()) {
      if (result?.result?.[0]?.text) {
        const text = result.result[0].text;

        // Skip obvious error messages
        if (
          text.includes('Error executing') ||
          text.includes('validation error')
        ) {
          continue;
        }

        // Return first non-error text if it seems reasonable
        if (text.length > 0 && text.length < 500) {
          return this.convertValueToParameterType(text, paramSchema);
        }
      }
    }

    return null;
  }

  private async generateFinalResponse(
    originalPrompt: string,
    initialResponse: string,
    toolResults: any[],
    provider: any,
    systemPrompt: string,
  ): Promise<string> {
    // Build a comprehensive prompt for the final response
    let finalPrompt = `Based on the original request and the tool execution results, provide a comprehensive final response.

Original Request: ${originalPrompt}

Initial Response: ${initialResponse}

Tool Execution Results:`;

    for (const toolResult of toolResults) {
      if (toolResult.error) {
        finalPrompt += `\n\n${toolResult.tool} (ERROR): ${toolResult.error}`;
      } else {
        // Format the tool result for better readability
        const resultText = this.formatToolResult(toolResult.result);
        finalPrompt += `\n\n${toolResult.tool} Results:\n${resultText}`;
      }
    }

    finalPrompt += `\n\nPlease provide a comprehensive final response that addresses the original request using the information gathered from the tool executions.`;

    try {
      const finalResult = await provider.generateText({
        prompt: finalPrompt,
        systemPrompt:
          systemPrompt +
          '\n\nYou are a helpful AI assistant that provides comprehensive responses based on tool execution results.',
        temperature: 0.7,
        maxTokens: 2000,
      });

      return (
        finalResult.text ||
        finalResult.content ||
        'Unable to generate final response.'
      );
    } catch (error) {
      this.logger.error('Failed to generate final response:', error);
      // Fallback: return a summary of the tool results
      return this.createFallbackResponse(originalPrompt, toolResults);
    }
  }

  private formatToolResult(result: any): string {
    if (typeof result === 'string') {
      return result;
    } else if (result && typeof result === 'object') {
      // Handle structured results (like search results)
      if (Array.isArray(result)) {
        return result
          .map((item, index) => {
            if (typeof item === 'string') {
              return `${index + 1}. ${item}`;
            } else if (item && typeof item === 'object') {
              return `${index + 1}. ${JSON.stringify(item, null, 2)}`;
            }
            return `${index + 1}. ${String(item)}`;
          })
          .join('\n');
      } else {
        return JSON.stringify(result, null, 2);
      }
    }
    return String(result);
  }

  private createFallbackResponse(
    originalPrompt: string,
    toolResults: any[],
  ): string {
    let response = `Based on the original request: "${originalPrompt}"\n\n`;

    if (toolResults.length === 0) {
      response += 'No tools were executed.';
    } else {
      response += 'Tool execution results:\n';
      for (const toolResult of toolResults) {
        if (toolResult.error) {
          response += `\n- ${toolResult.tool}: Error - ${toolResult.error}`;
        } else {
          const resultText = this.formatToolResult(toolResult.result);
          response += `\n- ${toolResult.tool}: ${resultText.substring(0, 200)}...`;
        }
      }
    }

    return response;
  }

  private async reflect(
    executionResult: any,
    stepNumber: number,
  ): Promise<ThinkingStep> {
    const reflectionPrompt = `
      Analyze the following execution result and provide insights:
      
      Result: ${JSON.stringify(executionResult, null, 2)}
      
      Consider:
      1. Was the result accurate and complete?
      2. Were the right tools used?
      3. What could be improved?
      4. Overall confidence in the result?
    `;

    try {
      // Use a simple reflection for now
      const confidence = this.assessResultQuality(executionResult);
      const reasoning = this.generateReflectionReasoning(
        executionResult,
        confidence,
      );

      return {
        step: stepNumber,
        type: 'reflection',
        reasoning,
        confidence,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn('Reflection step failed:', error);

      return {
        step: stepNumber,
        type: 'reflection',
        reasoning: 'Reflection analysis unavailable.',
        confidence: 0.5,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private buildPlanningPrompt(params: ReasoningParams): string {
    const availableTools = params.tools.map((t) => t.name).join(', ');

    return `
      Create a step-by-step plan to address this request: "${params.prompt}"
      
      Available tools: ${availableTools}
      Thinking mode: ${params.thinkingMode}
      
      Provide a clear, numbered plan with 3-5 steps.
    `;
  }

  private buildToolSelectionPrompt(prompt: string, tools: any[]): string {
    const toolsList = tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    return `
     ## Role
You are an expert tool selector and parameter specialist with deep knowledge across multiple domains including blockchain operations, data analysis, content creation, web development, file management, API integrations, database operations, machine learning, automation, and various other technical and non-technical fields. You possess exceptional analytical skills for matching user requests to appropriate tools, with expertise in interpreting requirements and translating them into precise tool selections with accurate parameters.

## Task
Analyze incoming user requests and select the most appropriate tools from the available toolkit to fulfill each request. You must identify the exact tools needed and specify any required parameters based on the user's specific requirements across any domain or field of operation. For this request: "${prompt}"

## Context
This tool selection process is critical for enabling users to interact with various systems effectively across all domains, not limited to blockchain operations. Your selections directly impact the user's ability to perform operations in any field including but not limited to finance, content creation, data processing, web services, file operations, and countless other applications. Accurate tool selection with proper parameters ensures seamless interactions and prevents failed operations that could result in lost time, missed opportunities, or user frustration.

## Instructions

### Primary Analysis Process
1. **Request Parsing**: Read the user request word by word to identify the specific operation they want to perform in any domain
2. **Tool Matching**: Compare the request requirements against the available tools list to identify exact matches regardless of the field or domain
3. **Parameter Identification**: Extract any specific values, identifiers, or inputs mentioned in the request that need to be passed as parameters
4. **Tool Selection**: Choose only the tools that are directly required - never suggest generic alternatives

Available tools:
${toolsList}

### Tool Selection Rules
- **MANDATORY**: You MUST use only the available tools provided in the toolsList
- **NO GENERIC RESPONSES**: Never provide generic instructions or suggest actions outside the available tools
- **EXACT MATCHING**: Match user requests to specific tool functions based on their described capabilities across all domains
- **PARAMETER PRECISION**: When tools require parameters, extract them exactly as mentioned in the user request

### Common Request Patterns and Tool Mappings Across All Domains

**Blockchain/Crypto Operations:**
- Balance inquiries → "get_balance" tool (requires address parameter)
- Wallet address requests → "get_address" tool
- Chain/network information → "get_chain" tool
- Transaction details → Look for transaction-related tools in the available list
- Token information → Look for token-related tools in the available list

**Other Domain Examples:**
- File operations → Look for file management tools
- Data analysis → Look for data processing or analytics tools
- Content creation → Look for writing, editing, or content generation tools
- Web operations → Look for HTTP, API, or web-related tools
- Database operations → Look for database query or management tools
- Image/media processing → Look for media manipulation tools
- Communication → Look for messaging, email, or notification tools
- Automation → Look for workflow or scheduling tools

For any domain not explicitly mentioned, match request intent to the appropriate tool in the available list based on the tool's described functionality.

### Parameter Handling
- Extract addresses, identifiers, file paths, URLs, or other values exactly as provided
- Format parameters clearly: "tool_name with parameter_type: parameter_value"
- If multiple parameters are needed, list each one separately
- Validate that extracted parameters match the expected format for the operation
- Handle parameters for any data type: strings, numbers, arrays, objects, file paths, URLs, etc.

### Output Format Requirements
Analyze the user request and explain which tools would be most helpful. Include any specific parameters, queries, or values that would be needed. Write naturally about your tool selection reasoning.

For example:
- "I'll use the database query tool to find information about users with the SQL: SELECT * FROM users WHERE active = true"
- "I need to search for TypeScript best practices using the search tool"
- "I should check the wallet balance for address 0x1234567890abcdef..."

The system will automatically extract the tools and parameters from your natural explanation.


### Critical Error Prevention
- **Your life depends on you** never selecting tools that are not in the provided toolsList regardless of the domain or field
- Double-check that every selected tool exists in the available tools before including it
- Verify that parameters are extracted correctly from the user request
- Ensure you're not making assumptions about tool capabilities beyond what's available
- If a request cannot be fulfilled with available tools, state this clearly rather than suggesting alternatives
- Handle requests from any domain with the same precision as blockchain operations

### Edge Cases to Handle
- Requests mentioning multiple parameters across different domains
- Ambiguous requests that could match multiple tools in various fields
- Requests for operations not supported by available tools in any domain
- Malformed parameters in user requests from any field
- Requests combining multiple operations across different domains and fields
- Cross-domain operations that might require multiple tools
- Domain-specific terminology that needs to be mapped to generic tool functions

Your accuracy in tool selection and parameter extraction is vital to the user's success in their operations across all domains and fields.
    `;
  }

  private buildExecutionContext(steps: ThinkingStep[]): string {
    const context = steps
      .map((step) => `${step.type.toUpperCase()}: ${step.reasoning}`)
      .join('\n\n');

    return `Based on the following analysis:\n\n${context}`;
  }

  private extractSelectedTools(
    reasoning: string,
    availableTools: any[],
  ): { name: string; parameters?: any }[] {
    const selected: { name: string; parameters?: any }[] = [];
    const reasoningLower = reasoning.toLowerCase();

    for (const tool of availableTools) {
      // Handle both name and id properties
      const toolName = tool.name || tool.id;
      if (!toolName) {
        this.logger.warn(`Tool missing name/id property:`, tool);
        continue;
      }

      const toolNameLower = toolName.toLowerCase();
      let toolFound = false;

      // Check for exact tool name match
      if (reasoningLower.includes(toolNameLower)) {
        toolFound = true;
      }
      // Check for tool name with underscores replaced by spaces
      else if (reasoningLower.includes(toolNameLower.replace(/_/g, ' '))) {
        toolFound = true;
      }
      // Check for partial matches (for tools like "get_balance" matching "balance")
      else {
        const toolWords = toolNameLower.split('_');
        for (const word of toolWords) {
          if (word.length > 3 && reasoningLower.includes(word)) {
            toolFound = true;
            break;
          }
        }
      }

      if (!toolFound) continue;

      // Dynamic parameter extraction based on tool's input schema
      const parameters = this.extractParametersDynamically(
        reasoning,
        tool,
        toolName,
      );

      selected.push({
        name: toolName,
        parameters: Object.keys(parameters).length > 0 ? parameters : {},
      });
    }

    this.logger.log(
      `Extracted tools from reasoning: ${selected.map((t) => `${t.name}(${JSON.stringify(t.parameters)})`).join(', ')}`,
    );
    return selected;
  }

  /**
   * Dynamically extract parameters based on tool schema and natural language context
   */
  private extractParametersDynamically(
    reasoning: string,
    tool: any,
    toolName: string,
  ): any {
    const parameters: any = {};

    this.logger.log(`Extracting parameters for tool ${toolName}`);
    this.logger.log(`Tool schema:`, JSON.stringify(tool.inputSchema, null, 2));

    // Get tool context (text around the tool mention)
    const toolContext = this.extractToolContext(reasoning, toolName);
    this.logger.log(`Tool context: ${toolContext.substring(0, 200)}...`);

    // If tool has input schema, use it to guide parameter extraction
    if (tool.inputSchema?.properties) {
      this.logger.log(
        `Found ${Object.keys(tool.inputSchema.properties).length} parameters in schema`,
      );

      for (const [paramName, paramSchema] of Object.entries(
        tool.inputSchema.properties,
      )) {
        this.logger.log(
          `Extracting parameter: ${paramName} (type: ${(paramSchema as any)?.type})`,
        );

        const extractedValue = this.extractParameterValue(
          reasoning,
          toolContext,
          paramName,
          paramSchema as any,
        );

        if (extractedValue !== null) {
          parameters[paramName] = extractedValue;
          this.logger.log(
            `✅ Successfully extracted ${paramName}: ${extractedValue}`,
          );
        } else {
          this.logger.log(`❌ Failed to extract parameter: ${paramName}`);
        }
      }
    } else {
      this.logger.log(
        `No input schema found, using common parameter extraction`,
      );
      // Fallback: extract common parameter patterns when no schema available
      const commonParams = this.extractCommonParameters(reasoning, toolContext);
      Object.assign(parameters, commonParams);
    }

    this.logger.log(
      `Final extracted parameters:`,
      JSON.stringify(parameters, null, 2),
    );
    return parameters;
  }

  /**
   * Extract a specific parameter value using multiple strategies
   */
  private extractParameterValue(
    fullReasoning: string,
    toolContext: string,
    paramName: string,
    paramSchema: any,
  ): any {
    // Strategy 1: Look for explicit "parameter: value" patterns
    const explicitPatterns = [
      new RegExp(`${paramName}\\s*[:=]\\s*["']?([^"'\\n,}]+)["']?`, 'i'),
      new RegExp(`"${paramName}"\\s*[:=]\\s*["']?([^"'\\n,}]+)["']?`, 'i'),
      new RegExp(
        `with\\s+${paramName}\\s*[:=]\\s*["']?([^"'\\n,}]+)["']?`,
        'i',
      ),
    ];

    for (const pattern of explicitPatterns) {
      const match = fullReasoning.match(pattern);
      if (match && match[1]) {
        const extractedValue = match[1].trim();
        if (
          this.isValidParameterValue(extractedValue, paramName, paramSchema)
        ) {
          this.logger.log(
            `✅ Successfully extracted ${paramName}: ${extractedValue}`,
          );
          return this.cleanExtractedValue(
            extractedValue,
            paramName,
            paramSchema,
          );
        }
      }
    }

    // Strategy 2: Look for values in backticks or code blocks
    const codePatterns = [
      new RegExp(`\`([^\`]+)\`.*${paramName}`, 'i'),
      new RegExp(`${paramName}.*\`([^\`]+)\``, 'i'),
      new RegExp(`\\b${paramName}\\s*[:=]\\s*\`([^\`]+)\``, 'i'),
    ];

    for (const pattern of codePatterns) {
      const match = fullReasoning.match(pattern);
      if (match && match[1]) {
        const extractedValue = match[1].trim();
        if (
          this.isValidParameterValue(extractedValue, paramName, paramSchema)
        ) {
          this.logger.log(
            `✅ Successfully extracted ${paramName} from code: ${extractedValue}`,
          );
          return this.cleanExtractedValue(
            extractedValue,
            paramName,
            paramSchema,
          );
        }
      }
    }

    // Strategy 3: Type-based extraction for common parameter types
    const paramNameLower = paramName.toLowerCase();
    const paramType = paramSchema?.type || 'string';

    // For addresses - look for Ethereum addresses
    if (paramNameLower.includes('address') || paramType === 'string') {
      const addressPattern = /0x[a-fA-F0-9]{40}/g;
      const addresses = fullReasoning.match(addressPattern);
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        if (this.isValidParameterValue(address, paramName, paramSchema)) {
          this.logger.log(`✅ Successfully extracted ${paramName}: ${address}`);
          return this.cleanExtractedValue(address, paramName, paramSchema);
        }
      }
    }

    // For URLs - look for URL patterns
    if (paramNameLower.includes('url') || paramNameLower.includes('endpoint')) {
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = fullReasoning.match(urlPattern);
      if (urls && urls.length > 0) {
        const url = urls[0];
        if (this.isValidParameterValue(url, paramName, paramSchema)) {
          this.logger.log(`✅ Successfully extracted ${paramName}: ${url}`);
          return this.cleanExtractedValue(url, paramName, paramSchema);
        }
      }
    }

    // For messages - look for quoted text
    if (paramNameLower.includes('message') || paramNameLower.includes('text')) {
      const messagePattern = /["']([^"']+)["']/g;
      const messages = fullReasoning.match(messagePattern);
      if (messages && messages.length > 0) {
        const message = messages[0].replace(/["']/g, '');
        if (this.isValidParameterValue(message, paramName, paramSchema)) {
          this.logger.log(`✅ Successfully extracted ${paramName}: ${message}`);
          return this.cleanExtractedValue(message, paramName, paramSchema);
        }
      }
    }

    // For numbers - look for numeric values
    if (paramType === 'number' || paramType === 'integer') {
      const numberPattern = /\b\d+(\.\d+)?\b/g;
      const numbers = fullReasoning.match(numberPattern);
      if (numbers && numbers.length > 0) {
        const number = parseFloat(numbers[0]);
        if (
          !isNaN(number) &&
          this.isValidParameterValue(number.toString(), paramName, paramSchema)
        ) {
          this.logger.log(`✅ Successfully extracted ${paramName}: ${number}`);
          return number;
        }
      }
    }

    // Strategy 4: Context-based extraction
    const contextPatterns = [
      new RegExp(`\\b${paramName}\\s*[:=]\\s*([^\\n,}]+)`, 'i'),
      new RegExp(`parameter\\s+${paramName}\\s*[:=]\\s*([^\\n,}]+)`, 'i'),
      new RegExp(`with\\s+${paramName}\\s*[:=]\\s*([^\\n,}]+)`, 'i'),
    ];

    for (const pattern of contextPatterns) {
      const match = fullReasoning.match(pattern);
      if (match && match[1]) {
        const extractedValue = match[1].trim();
        if (
          this.isValidParameterValue(extractedValue, paramName, paramSchema)
        ) {
          this.logger.log(
            `✅ Successfully extracted ${paramName}: ${extractedValue}`,
          );
          return this.cleanExtractedValue(
            extractedValue,
            paramName,
            paramSchema,
          );
        }
      }
    }

    this.logger.warn(`❌ Failed to extract parameter: ${paramName}`);
    return null;
  }

  /**
   * Clean extracted value by removing common artifacts
   */
  private cleanExtractedValue(
    value: string,
    paramName: string,
    paramSchema: any,
  ): any {
    if (!value) return value;

    let cleanedValue = value.trim();

    // Remove common artifacts
    cleanedValue = cleanedValue
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^`|`$/g, '') // Remove surrounding backticks
      .replace(/^\[|\]$/g, '') // Remove surrounding brackets
      .replace(/^\{|\}$/g, '') // Remove surrounding braces
      .replace(/^\(|\)$/g, '') // Remove surrounding parentheses
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // For addresses, ensure it's a valid Ethereum address
    if (
      paramName.toLowerCase().includes('address') &&
      cleanedValue.startsWith('0x')
    ) {
      if (cleanedValue.length === 42) {
        return cleanedValue;
      } else {
        this.logger.warn(`Invalid Ethereum address length: ${cleanedValue}`);
        return null;
      }
    }

    // For numbers, convert to appropriate type
    if (paramSchema?.type === 'number' || paramSchema?.type === 'integer') {
      const num = parseFloat(cleanedValue);
      return isNaN(num) ? null : num;
    }

    return cleanedValue;
  }

  /**
   * Extract value based on parameter type and name
   */
  private extractValueByType(
    paramName: string,
    paramSchema: any,
    fullReasoning: string,
    toolContext: string,
  ): any {
    const paramType = paramSchema?.type || 'string';
    const paramNameLower = paramName.toLowerCase();

    // SQL/Query parameters
    if (
      paramNameLower.includes('query') ||
      paramNameLower.includes('sql') ||
      paramName === 'sql'
    ) {
      return this.extractSQLQuery(fullReasoning);
    }

    // Address parameters (blockchain, email, etc.)
    if (paramNameLower.includes('address')) {
      return this.extractAddress(fullReasoning, paramNameLower);
    }

    // File/Path parameters
    if (paramNameLower.includes('path') || paramNameLower.includes('file')) {
      return this.extractFilePath(fullReasoning);
    }

    // URL parameters
    if (paramNameLower.includes('url') || paramNameLower.includes('link')) {
      return this.extractURL(fullReasoning);
    }

    // Message/Text parameters
    if (paramNameLower.includes('message') || paramNameLower.includes('text')) {
      return this.extractMessage(fullReasoning, paramNameLower);
    }

    // Number parameters
    if (paramType === 'number' || paramType === 'integer') {
      return this.extractNumber(fullReasoning, paramNameLower);
    }

    // Boolean parameters
    if (paramType === 'boolean') {
      return this.extractBoolean(fullReasoning, paramNameLower);
    }

    // String parameters - look for quoted strings or meaningful text
    if (paramType === 'string') {
      return this.extractString(fullReasoning, paramNameLower);
    }

    return null;
  }

  /**
   * Extract SQL query from reasoning text
   */
  private extractSQLQuery(fullReasoning: string): string | null {
    // Look for SQL queries in code blocks
    const codeBlockMatch = fullReasoning.match(
      /```(?:sql)?\s*(SELECT|INSERT|UPDATE|DELETE|SHOW|DESCRIBE|CREATE|DROP|ALTER)[\s\S]*?```/i,
    );
    if (codeBlockMatch) {
      const sqlQuery = codeBlockMatch[0]
        .replace(/```(?:sql)?\s*/, '')
        .replace(/```$/, '')
        .trim();
      this.logger.log(`Found SQL in code block: ${sqlQuery}`);
      return sqlQuery;
    }

    // Look for SQL-like content anywhere in the text
    const sqlMatch = fullReasoning.match(
      /(SELECT|INSERT|UPDATE|DELETE|SHOW|DESCRIBE|CREATE|DROP|ALTER)[\s\S]*?(?=;|\.|$|```)/i,
    );
    if (sqlMatch) {
      const sqlQuery = sqlMatch[0].trim().replace(/[;.]$/, '');
      this.logger.log(`Found SQL statement: ${sqlQuery}`);
      return sqlQuery;
    }

    // Look for information_schema queries specifically
    const infoSchemaMatch = fullReasoning.match(
      /SELECT[\s\S]*?FROM\s+information_schema[\s\S]*?(?=;|\.|$|```)/i,
    );
    if (infoSchemaMatch) {
      const sqlQuery = infoSchemaMatch[0].trim().replace(/[;.]$/, '');
      this.logger.log(`Found information_schema query: ${sqlQuery}`);
      return sqlQuery;
    }

    return null;
  }

  /**
   * Extract address (blockchain, email, etc.) from reasoning text
   */
  private extractAddress(
    fullReasoning: string,
    paramNameLower: string,
  ): string | null {
    // Ethereum addresses
    if (
      paramNameLower.includes('wallet') ||
      paramNameLower.includes('eth') ||
      paramNameLower.includes('blockchain')
    ) {
      const ethAddressMatch = fullReasoning.match(/(0x[a-fA-F0-9]{40})/);
      if (ethAddressMatch) {
        return ethAddressMatch[1];
      }
    }

    // Email addresses
    if (paramNameLower.includes('email') || paramNameLower.includes('mail')) {
      const emailMatch = fullReasoning.match(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      );
      if (emailMatch) {
        return emailMatch[0];
      }
    }

    // Generic address extraction
    const addressMatch = fullReasoning.match(/(0x[a-fA-F0-9]{40})/);
    if (addressMatch) {
      return addressMatch[1];
    }

    return null;
  }

  /**
   * Extract file path from reasoning text
   */
  private extractFilePath(fullReasoning: string): string | null {
    const pathMatch = fullReasoning.match(
      /([\/\w.-]+\.[a-zA-Z]{2,4}|\/[\w\/.-]+)/g,
    );
    if (pathMatch) {
      return pathMatch[0];
    }
    return null;
  }

  /**
   * Extract URL from reasoning text
   */
  private extractURL(fullReasoning: string): string | null {
    const urlMatch = fullReasoning.match(/(https?:\/\/[^\s"'<>]+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }
    return null;
  }

  /**
   * Extract message/text content from reasoning text
   */
  private extractMessage(
    fullReasoning: string,
    paramNameLower: string,
  ): string | null {
    // Look for quoted messages
    const quotedMatch = fullReasoning.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // Look for meaningful text after "message:" or similar
    const messageMatch = fullReasoning.match(
      /(?:message|text)\s*[:=]\s*["']?([^"'\\n,}]+)["']?/i,
    );
    if (messageMatch) {
      return messageMatch[1].trim();
    }

    // For sign_message, generate a meaningful default
    if (paramNameLower.includes('sign')) {
      return 'Hello, this is a test message for signing.';
    }

    return null;
  }

  /**
   * Extract number from reasoning text
   */
  private extractNumber(
    fullReasoning: string,
    paramNameLower: string,
  ): number | null {
    const numberMatch = fullReasoning.match(/\b(\d+(?:\.\d+)?)\b/);
    if (numberMatch) {
      return parseFloat(numberMatch[1]);
    }
    return null;
  }

  /**
   * Extract boolean from reasoning text
   */
  private extractBoolean(
    fullReasoning: string,
    paramNameLower: string,
  ): boolean | null {
    const trueMatch = fullReasoning.match(/\b(true|yes|on|enabled)\b/i);
    if (trueMatch) {
      return true;
    }
    const falseMatch = fullReasoning.match(/\b(false|no|off|disabled)\b/i);
    if (falseMatch) {
      return false;
    }
    return null;
  }

  /**
   * Extract string from reasoning text
   */
  private extractString(
    fullReasoning: string,
    paramNameLower: string,
  ): string | null {
    // Look for quoted strings
    const quotedMatch = fullReasoning.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // Look for meaningful text patterns
    const textMatch = fullReasoning.match(/\b([a-zA-Z][a-zA-Z0-9\s]{2,20})\b/);
    if (textMatch) {
      return textMatch[1].trim();
    }

    return null;
  }

  /**
   * Dynamically generate intelligent parameter values using semantic analysis
   */
  private generateIntelligentDefault(
    paramName: string,
    paramSchema: any,
    conversationContext: string = '',
  ): any {
    return this.generateParameterSemantics(
      paramName,
      paramSchema,
      conversationContext,
    );
  }

  /**
   * Semantic parameter generation - dynamic and context-aware
   */
  private generateParameterSemantics(
    paramName: string,
    paramSchema: any,
    conversationContext: string,
  ): any {
    const paramNameLower = paramName.toLowerCase();
    const paramType = paramSchema?.type || 'string';

    // Extract context-aware values first
    const contextValue = this.extractFromContext(
      paramName,
      paramType,
      conversationContext,
    );
    if (contextValue !== null) {
      this.logger.log(
        `Generated from context for ${paramName}: ${contextValue}`,
      );
      return contextValue;
    }

    // Generate semantic defaults based on parameter meaning
    return this.generateSemanticDefault(paramNameLower, paramType, paramSchema);
  }

  /**
   * Extract parameter values from conversation context using semantic analysis
   */
  private extractFromContext(
    paramName: string,
    paramType: string,
    context: string,
  ): any {
    if (!context) return null;

    const paramNameLower = paramName.toLowerCase();
    const contextLower = context.toLowerCase();

    // Address extraction - look for blockchain addresses in context
    if (
      paramNameLower.includes('address') ||
      paramNameLower.includes('wallet')
    ) {
      // Ethereum addresses
      const ethMatch = context.match(/0x[a-fA-F0-9]{40}/);
      if (ethMatch) return ethMatch[0];

      // Sei addresses
      const seiMatch = context.match(/sei1[a-z0-9]{38,58}/);
      if (seiMatch) return seiMatch[0];

      // ENS names
      const ensMatch = context.match(/\b\w+\.eth\b/);
      if (ensMatch) return ensMatch[0];
    }

    // Chain ID extraction
    if (
      paramNameLower.includes('chain') ||
      paramNameLower.includes('network')
    ) {
      // Look for chain mentions
      if (contextLower.includes('ethereum') || contextLower.includes('eth'))
        return '1';
      if (contextLower.includes('polygon')) return '137';
      if (contextLower.includes('bsc')) return '56';
      if (contextLower.includes('arbitrum')) return '42161';
      if (contextLower.includes('sei')) return 'pacific-1';
    }

    // Boolean extraction from context intent
    if (paramType === 'boolean') {
      if (paramNameLower.includes('include')) {
        return (
          contextLower.includes('with') ||
          contextLower.includes('include') ||
          contextLower.includes('show')
        );
      }
      if (
        paramNameLower.includes('enable') ||
        paramNameLower.includes('active')
      ) {
        return (
          contextLower.includes('enable') ||
          contextLower.includes('activate') ||
          contextLower.includes('on')
        );
      }
    }

    // Token/symbol extraction
    if (paramNameLower.includes('token') || paramNameLower.includes('symbol')) {
      const tokenMatch = context.match(
        /\b(ETH|BTC|USDC|USDT|DAI|WETH|MATIC|BNB|ARB|SEI)\b/i,
      );
      if (tokenMatch) return tokenMatch[0].toUpperCase();
    }

    // Amount/value extraction
    if (paramNameLower.includes('amount') || paramNameLower.includes('value')) {
      const amountMatch = context.match(/(\d+(?:\.\d+)?)\s*(?:ETH|BTC|USD|%)/i);
      if (amountMatch) return amountMatch[1];
    }

    return null;
  }

  /**
   * Generate semantic defaults based on parameter name and type
   */
  private generateSemanticDefault(
    paramNameLower: string,
    paramType: string,
    paramSchema: any,
  ): any {
    // Boolean parameters - intelligent defaults
    if (paramType === 'boolean') {
      if (
        paramNameLower.includes('include_transactions') ||
        paramNameLower.includes('include_tx')
      )
        return true;
      if (
        paramNameLower.includes('include_') ||
        paramNameLower.includes('show_')
      )
        return true;
      if (
        paramNameLower.includes('enable_') ||
        paramNameLower.includes('active_')
      )
        return false;
      return false;
    }

    // Number parameters - context-aware defaults
    if (paramType === 'number' || paramType === 'integer') {
      if (paramNameLower.includes('limit') || paramNameLower.includes('count'))
        return 10;
      if (paramNameLower.includes('page') || paramNameLower.includes('offset'))
        return 0;
      if (
        paramNameLower.includes('chain') ||
        paramNameLower.includes('network')
      )
        return 1; // Ethereum
      return 0;
    }

    // String parameters - semantic defaults
    if (paramType === 'string') {
      if (
        paramNameLower.includes('block') &&
        (paramNameLower.includes('number') || paramNameLower.includes('hash'))
      ) {
        return 'latest';
      }
      if (
        paramNameLower.includes('chain_id') ||
        paramNameLower.includes('chainid')
      )
        return '1';
      if (
        paramNameLower.includes('cursor') ||
        paramNameLower.includes('next_page')
      )
        return null; // Skip pagination
      if (
        paramNameLower.includes('transaction_hash') ||
        paramNameLower.includes('tx_hash')
      )
        return null; // Don't fake hashes
    }

    // Array parameters
    if (paramType === 'array') {
      return [];
    }

    // Object parameters
    if (paramType === 'object') {
      return {};
    }

    return null;
  }

  /**
   * AI-driven parameter generation - completely dynamic and context-aware
   */
  private async generateParameterWithAI(
    paramName: string,
    paramSchema: any,
    fullReasoning: string,
    conversationContext: string,
    provider: any,
  ): Promise<any> {
    const generationPrompt = this.buildParameterGenerationPrompt(
      paramName,
      paramSchema,
      fullReasoning,
      conversationContext,
    );

    const response = await provider.generateText({
      prompt: generationPrompt,
      maxTokens: 200,
      temperature: 0.2, // Low temperature for consistent generation
    });

    return this.parseAIGeneratedParameter(response, paramSchema);
  }

  /**
   * Build dynamic parameter generation prompt
   */
  private buildParameterGenerationPrompt(
    paramName: string,
    paramSchema: any,
    fullReasoning: string,
    conversationContext: string,
  ): string {
    return `As an AI parameter generator, create an appropriate value for this parameter based on context.

PARAMETER DETAILS:
- Name: ${paramName}
- Type: ${paramSchema?.type || 'unknown'}
- Description: ${paramSchema?.description || 'No description'}
- Required: ${paramSchema?.required || false}

CONTEXT FROM REASONING: ${fullReasoning.slice(-800)} // Last 800 chars

CONVERSATION CONTEXT: ${conversationContext.slice(-400)} // Last 400 chars

GENERATION RULES:
1. Extract real values from the context when possible
2. For addresses: Look for wallet addresses, ENS names, or blockchain addresses in context
3. For chain_id: Use appropriate chain based on context (1=Ethereum, 137=Polygon, etc.)
4. For booleans: Use true/false based on parameter meaning and context
5. For optional parameters: Return null if no clear value can be determined
6. Never return placeholder values, error messages, or fake data

RESPONSE FORMAT:
If you can determine a value: "VALUE: [the actual value]"
If parameter should be skipped: "SKIP: [reason]"
If you need more context: "CONTEXT_NEEDED: [what's missing]"

Generate the most appropriate value:`;
  }

  /**
   * Parse AI-generated parameter response
   */
  private parseAIGeneratedParameter(response: string, paramSchema: any): any {
    const trimmedResponse = response.trim();

    if (trimmedResponse.startsWith('VALUE:')) {
      const value = trimmedResponse.replace('VALUE:', '').trim();
      return this.convertValueToParameterType(value, paramSchema);
    }

    if (
      trimmedResponse.startsWith('SKIP:') ||
      trimmedResponse.startsWith('CONTEXT_NEEDED:')
    ) {
      return null;
    }

    // Fallback: try to extract value from response
    return this.convertValueToParameterType(trimmedResponse, paramSchema);
  }

  /**
   * Convert string value to appropriate parameter type
   */
  private convertValueToParameterType(value: string, paramSchema: any): any {
    const paramType = paramSchema?.type || 'string';

    switch (paramType) {
      case 'boolean':
        return /^(true|yes|1|on)$/i.test(value);
      case 'number':
      case 'integer':
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      default:
        return value === 'null' ? null : value;
    }
  }

  /**
   * Fallback parameter generation when AI fails
   */
  private generateFallbackParameter(paramName: string, paramSchema: any): any {
    const paramType = paramSchema?.type || 'string';

    // Return appropriate defaults based on type only
    switch (paramType) {
      case 'boolean':
        return false;
      case 'number':
      case 'integer':
        return 0;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null; // Skip unknown parameters
    }
  }

  /**
   * Extract common patterns from reasoning text
   */
  private extractCommonPatterns(
    paramName: string,
    paramSchema: any,
    fullReasoning: string,
  ): any {
    const paramNameLower = paramName.toLowerCase();

    // Look for any word that might match the parameter name
    const words = fullReasoning.split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (
        cleanWord.length > 2 &&
        paramNameLower.includes(cleanWord.toLowerCase())
      ) {
        return cleanWord;
      }
    }

    return null;
  }

  /**
   * Dynamically validate parameter value using semantic intelligence
   */
  private isValidParameterValue(
    value: string,
    paramName: string,
    paramSchema: any,
    conversationContext: string = '',
  ): boolean {
    if (!value || value.trim() === '') {
      return false;
    }

    return this.validateParameterSemantics(
      value,
      paramName,
      paramSchema,
      conversationContext,
    );
  }

  /**
   * Semantic parameter validation - dynamic without heavy AI usage
   */
  private validateParameterSemantics(
    value: string,
    paramName: string,
    paramSchema: any,
    conversationContext: string,
  ): boolean {
    const valueStr = String(value).trim();
    const paramNameLower = paramName.toLowerCase();
    const paramType = paramSchema?.type || 'string';

    // Dynamic error detection using semantic patterns
    if (this.isErrorMessage(valueStr)) {
      this.logger.log(
        `Rejected error message as parameter: ${paramName}="${valueStr}"`,
      );
      return false;
    }

    // Dynamic placeholder detection
    if (this.isPlaceholderValue(valueStr)) {
      this.logger.log(
        `Rejected placeholder as parameter: ${paramName}="${valueStr}"`,
      );
      return false;
    }

    // Context-aware semantic validation
    return this.validateBySemanticType(
      valueStr,
      paramNameLower,
      paramType,
      conversationContext,
    );
  }

  /**
   * Dynamic error message detection using semantic analysis
   */
  private isErrorMessage(value: string): boolean {
    const errorIndicators = [
      'error',
      'failed',
      'exception',
      'validation',
      'pydantic',
      'http/1.1',
      'status code',
      'bad request',
      'not found',
      'expired',
      'invalid',
      'cannot',
      'unable',
      'denied',
    ];

    const valueLower = value.toLowerCase();
    return errorIndicators.some(
      (indicator) =>
        valueLower.includes(indicator) &&
        valueLower.length > indicator.length * 3,
    );
  }

  /**
   * Dynamic placeholder detection using semantic analysis
   */
  private isPlaceholderValue(value: string): boolean {
    const placeholderIndicators = [
      'placeholder',
      'default_value',
      'example',
      'sample',
      'test_value',
      'dummy',
      'mock',
      'fake',
      'retrieved_',
      'generated_',
    ];

    const valueLower = value.toLowerCase();
    return placeholderIndicators.some((indicator) =>
      valueLower.includes(indicator),
    );
  }

  /**
   * Semantic type validation based on parameter context
   */
  private validateBySemanticType(
    value: string,
    paramNameLower: string,
    paramType: string,
    conversationContext: string,
  ): boolean {
    // Address validation - dynamic pattern recognition
    if (
      paramNameLower.includes('address') ||
      paramNameLower.includes('wallet')
    ) {
      return this.validateAddressSemantics(value, conversationContext);
    }

    // Chain/Network validation
    if (
      paramNameLower.includes('chain') ||
      paramNameLower.includes('network')
    ) {
      return this.validateChainSemantics(value);
    }

    // Boolean validation
    if (paramType === 'boolean') {
      return this.validateBooleanSemantics(value);
    }

    // Number validation
    if (paramType === 'number' || paramType === 'integer') {
      return this.validateNumberSemantics(value);
    }

    // URL validation
    if (paramNameLower.includes('url') || paramNameLower.includes('link')) {
      return this.validateUrlSemantics(value);
    }

    // Default string validation - be permissive but intelligent
    return this.validateStringSemantics(
      value,
      paramNameLower,
      conversationContext,
    );
  }

  /**
   * Dynamic address validation using multiple blockchain patterns
   */
  private validateAddressSemantics(value: string, context: string): boolean {
    // Ethereum addresses
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) return true;

    // Sei addresses
    if (/^sei1[a-z0-9]{38,58}$/.test(value)) return true;

    // Bitcoin addresses (basic patterns)
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(value)) return true;
    if (/^bc1[a-z0-9]{39,59}$/.test(value)) return true;

    // Other blockchain patterns can be dynamically added
    return false;
  }

  /**
   * Dynamic chain validation
   */
  private validateChainSemantics(value: string): boolean {
    // Numeric chain IDs
    if (/^\d+$/.test(value)) return true;

    // Named chains
    const validChainNames = [
      'mainnet',
      'testnet',
      'sepolia',
      'goerli',
      'polygon',
      'bsc',
      'arbitrum',
    ];
    return validChainNames.includes(value.toLowerCase());
  }

  /**
   * Dynamic boolean validation
   */
  private validateBooleanSemantics(value: string): boolean {
    const booleanValues = ['true', 'false', 'yes', 'no', 'on', 'off', '1', '0'];
    return booleanValues.includes(value.toLowerCase());
  }

  /**
   * Dynamic number validation
   */
  private validateNumberSemantics(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }

  /**
   * Dynamic URL validation
   */
  private validateUrlSemantics(value: string): boolean {
    return /^https?:\/\/.+\..+/.test(value);
  }

  /**
   * Dynamic string validation with context awareness
   */
  private validateStringSemantics(
    value: string,
    paramName: string,
    context: string,
  ): boolean {
    // Length checks
    if (value.length === 0 || value.length > 5000) return false;

    // Content quality checks
    if (value === paramName) return false; // Parameter name as value
    if (/^[^a-zA-Z0-9]*$/.test(value)) return false; // Only special chars

    return true;
  }

  /**
   * AI-driven parameter validation - completely dynamic
   */
  private async validateParameterWithAI(
    value: string,
    paramName: string,
    paramSchema: any,
    conversationContext: string,
    provider: any,
  ): Promise<boolean> {
    try {
      const validationPrompt = this.buildParameterValidationPrompt(
        value,
        paramName,
        paramSchema,
        conversationContext,
      );

      const response = await provider.generateText({
        prompt: validationPrompt,
        maxTokens: 150,
        temperature: 0.1, // Low temperature for consistent validation
      });

      // Parse AI response - expect "VALID" or "INVALID" with reasoning
      const isValid =
        response.toLowerCase().includes('valid') &&
        !response.toLowerCase().includes('invalid');

      if (!isValid) {
        this.logger.log(
          `AI rejected parameter ${paramName}="${value}": ${response}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.warn(
        `AI validation failed for ${paramName}, using fallback:`,
        error,
      );
      return this.fallbackParameterValidation(value, paramName, paramSchema);
    }
  }

  /**
   * Build dynamic validation prompt for AI
   */
  private buildParameterValidationPrompt(
    value: string,
    paramName: string,
    paramSchema: any,
    conversationContext: string,
  ): string {
    return `As an AI parameter validator, determine if this parameter value is appropriate and valid.

PARAMETER DETAILS:
- Name: ${paramName}
- Type: ${paramSchema?.type || 'unknown'}
- Description: ${paramSchema?.description || 'No description'}
- Value: "${value}"

CONVERSATION CONTEXT: ${conversationContext.slice(-500)} // Last 500 chars

VALIDATION CRITERIA:
1. Is this value semantically appropriate for the parameter name?
2. Does it match the expected data type?
3. Is it a real, usable value (not an error message, placeholder, or invalid data)?
4. Does it make sense in the conversation context?

ERROR INDICATORS TO REJECT:
- Error messages (contains "error", "failed", "exception")
- Validation errors (contains "validation error", "pydantic")
- HTTP responses (contains "HTTP/1.1", status codes)
- Placeholder values ("default_value", "placeholder", "example")
- Invalid formats for the parameter type

Respond with: "VALID - [brief reason]" or "INVALID - [brief reason]"`;
  }

  /**
   * Fallback validation when AI fails
   */
  private fallbackParameterValidation(
    value: string,
    paramName: string,
    paramSchema: any,
  ): boolean {
    // Basic fallback checks
    const hasError =
      /error|failed|exception|validation|pydantic|http\/1\.1/i.test(value);
    const isPlaceholder =
      /placeholder|default_value|example|sample|test_value/i.test(value);
    const isTooLong = value.length > 2000;

    return !hasError && !isPlaceholder && !isTooLong;
  }

  /**
   * Extract common parameters when no schema is available
   */
  private extractCommonParameters(
    fullReasoning: string,
    toolContext: string,
  ): any {
    const parameters: any = {};

    // Common parameter extraction patterns
    const commonPatterns = {
      query: /(?:search|find|look\s+for|query)[:=]\s*["']?([^"'\n,}]+)["']?/i,
      path: /(?:path|file)[:=]\s*["']?([^"'\s,}]+)["']?/i,
      url: /(?:url|link)[:=]\s*["']?(https?:\/\/[^\s"',}]+)["']?/i,
      address: /(0x[a-fA-F0-9]{40})/,
      text: /(?:text|content|message)[:=]\s*["']?([^"'\n,}]+)["']?/i,
    };

    // For search tools, also look for direct search terms
    if (
      toolContext.toLowerCase().includes('search') ||
      toolContext.toLowerCase().includes('typescript')
    ) {
      // Extract search terms more intelligently
      const searchMatch =
        fullReasoning.match(/(?:about|for|regarding)\s+([^.!?]+)/i) ||
        fullReasoning.match(/information\s+about\s+([^.!?]+)/i) ||
        fullReasoning.match(/search\s+for\s+([^.!?]+)/i);
      if (searchMatch) {
        parameters.query = searchMatch[1].trim();
        this.logger.log(
          `Extracted search query from context: ${parameters.query}`,
        );
      }
    }

    for (const [paramName, pattern] of Object.entries(commonPatterns)) {
      if (!parameters[paramName]) {
        // Don't override already extracted parameters
        const match = pattern.exec(toolContext) || pattern.exec(fullReasoning);
        if (match) {
          parameters[paramName] = match[1].trim();
        }
      }
    }

    return parameters;
  }

  /**
   * Convert extracted string value to appropriate type based on schema
   */
  private convertValueToType(value: string, paramSchema: any): any {
    if (!paramSchema || !paramSchema.type) {
      return value;
    }

    const schemaType =
      typeof paramSchema.type === 'string' ? paramSchema.type : 'string';

    switch (schemaType) {
      case 'number':
      case 'integer':
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : numValue;
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map((v) => v.trim());
        }
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Extract context around a tool mention for better parameter parsing
   */
  private extractToolContext(reasoning: string, toolName: string): string {
    const toolIndex = reasoning.toLowerCase().indexOf(toolName.toLowerCase());
    if (toolIndex === -1) return reasoning;

    // Extract 300 characters before and after the tool mention for better context
    const start = Math.max(0, toolIndex - 300);
    const end = Math.min(reasoning.length, toolIndex + toolName.length + 300);
    return reasoning.substring(start, end);
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private hashString(input: string): string {
    // Simple hash function for analytics
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private assessPlanConfidence(plan: string): number {
    // Simple heuristic based on plan structure
    const hasSteps = /\d+\.|\d+\)/.test(plan);
    const hasDetails = plan.length > 100;
    const hasLogicalFlow =
      plan.includes('first') ||
      plan.includes('then') ||
      plan.includes('finally');

    let confidence = 0.4; // Base confidence
    if (hasSteps) confidence += 0.2;
    if (hasDetails) confidence += 0.2;
    if (hasLogicalFlow) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  private assessResultQuality(result: any): number {
    let confidence = 0.5; // Base confidence

    // Check if result has content
    if (result.text || result.content) {
      confidence += 0.2;
    }

    // Check if tools were used successfully
    if (result.toolCalls && result.toolCalls.length > 0) {
      confidence += 0.1;
    }

    // Check response length (not too short, not too long)
    const text = result.text || result.content || '';
    if (text.length > 50 && text.length < 2000) {
      confidence += 0.1;
    }

    // Check for error indicators
    if (
      !text.toLowerCase().includes('error') &&
      !text.toLowerCase().includes('failed')
    ) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private generateReflectionReasoning(result: any, confidence: number): string {
    const text = result.text || result.content || '';
    const hasToolCalls = result.toolCalls && result.toolCalls.length > 0;

    let reasoning = `Analysis of execution result:\n`;
    reasoning += `- Response length: ${text.length} characters\n`;
    reasoning += `- Tools utilized: ${hasToolCalls ? result.toolCalls.length : 0}\n`;
    reasoning += `- Overall confidence: ${Math.round(confidence * 100)}%\n`;

    if (confidence > 0.7) {
      reasoning += `- Assessment: High-quality response with good coverage`;
    } else if (confidence > 0.5) {
      reasoning += `- Assessment: Adequate response, some improvement possible`;
    } else {
      reasoning += `- Assessment: Response may need refinement or additional context`;
    }

    return reasoning;
  }

  private sanitizePrompt(prompt: string): string {
    if (!prompt || typeof prompt !== 'string') {
      return '';
    }

    return prompt
      .trim()
      .slice(0, 10000) // Limit length to prevent DoS
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/data:/gi, '') // Remove data protocol
      .replace(/vbscript:/gi, '') // Remove vbscript protocol
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers
  }

  private calculateOverallConfidence(steps: ThinkingStep[]): number {
    if (steps.length === 0) return 0.5;

    const validSteps = steps.filter(
      (step) =>
        typeof step.confidence === 'number' &&
        !isNaN(step.confidence) &&
        isFinite(step.confidence),
    );

    if (validSteps.length === 0) return 0.5;

    const totalConfidence = validSteps.reduce(
      (sum, step) => sum + Math.max(0, Math.min(1, step.confidence)), // Clamp between 0 and 1
      0,
    );

    const avgConfidence = totalConfidence / validSteps.length;
    return Math.round(avgConfidence * 100) / 100; // Round to 2 decimal places
  }

  private async saveThinkingProcess(
    sessionId: string,
    steps: ThinkingStep[],
  ): Promise<void> {
    try {
      // Try to save to database if available
      await (this.databaseService.prisma as any).aiAgentExecution?.update({
        where: { id: sessionId },
        data: {
          thinkingSteps: steps as any,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.debug('Database not available for saving thinking process');
    }
  }
}
