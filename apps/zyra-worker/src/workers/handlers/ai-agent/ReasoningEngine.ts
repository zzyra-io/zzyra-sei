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

      // Step 1: Planning
      const planningStep = await this.planExecution(params, currentStep++);
      steps.push(planningStep);

      // Step 2: Tool Selection
      if (params.tools.length > 0) {
        const toolSelectionStep = await this.selectTools(params, currentStep++);
        steps.push(toolSelectionStep);
      }

      // Step 3: Execute with provider
      const executionResult = await this.executeWithProvider(params, steps);

      // Extract tool calls from execution
      if (executionResult.toolCalls) {
        toolCalls.push(...executionResult.toolCalls);
      }

      // Step 4: Reflection (if deliberate mode and user has access)
      if (params.thinkingMode === 'deliberate' && params.userId) {
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
      }

      // Save thinking process
      await this.saveThinkingProcess(params.sessionId, steps);

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

      return {
        step: stepNumber,
        type: 'planning',
        reasoning: plan,
        confidence,
        timestamp: new Date().toISOString(),
      };
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

      return {
        step: stepNumber,
        type: 'tool_selection',
        reasoning,
        confidence: selectedTools.length > 0 ? 0.8 : 0.3,
        toolsConsidered: availableTools.map((t) => t.name),
        decision: `Selected tools: ${selectedTools.join(', ')}`,
        timestamp: new Date().toISOString(),
      };
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
        // Enhance parameters with results from previous tools
        const enhancedParameters = this.enhanceParametersWithPreviousResults(
          toolEntry.parameters || {},
          previousResults,
          tool,
          toolEntry.name,
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
  private enhanceParametersWithPreviousResults(
    originalParameters: any,
    previousResults: Map<string, any>,
    tool: any,
    toolName: string,
  ): any {
    const enhancedParameters = { ...originalParameters };

    // If this tool needs parameters that might come from previous tools
    if (tool.inputSchema?.properties) {
      for (const [paramName, paramSchema] of Object.entries(
        tool.inputSchema.properties,
      )) {
        const schema = paramSchema as any;

        // Check if the parameter is missing or is an invalid placeholder
        let needsOverride = false;
        const currentValue = enhancedParameters[paramName];

        if (!currentValue) {
          needsOverride = true;
        } else if (typeof currentValue === 'string') {
          // Check for invalid placeholders or poor values
          const invalidPatterns = [
            /^balance$/i,
            /^placeholder$/i,
            /^default$/i,
            /^\[.*\]$/, // [wallet_address] style placeholders
            /^\{.*\}$/, // {placeholder} style placeholders
            /^`.*`$/, // `placeholder` style placeholders
            /^".*"$/, // "placeholder" style placeholders
            /^'.*'$/, // 'placeholder' style placeholders
            /^retrieved_.*$/i, // retrieved_address, retrieved_value, etc.
            /^\[.*\]`$/, // [retrieved_address]` style
            /^\{.*\}`$/, // {retrieved_address}` style
            /^".*"`$/, // "retrieved_address"` style
            /^'.*'`$/, // 'retrieved_address'` style
            /^`.*"$/, // `retrieved_address" style
            /^`.*'$/, // `retrieved_address' style
            /^".*`$/, // "retrieved_address` style
            /^'.*`$/, // 'retrieved_address` style
          ];

          if (invalidPatterns.some((pattern) => pattern.test(currentValue))) {
            this.logger.log(
              `Detected invalid parameter value: ${currentValue}, will override`,
            );
            needsOverride = true;
          }

          // Special validation for addresses - but be more lenient with user-provided addresses
          if (paramName.toLowerCase().includes('address')) {
            // If it's a valid Ethereum address, don't override
            if (currentValue.startsWith('0x') && currentValue.length === 42) {
              this.logger.log(
                `Respecting user-provided address: ${currentValue}`,
              );
              needsOverride = false;
            } else if (
              !currentValue.startsWith('0x') ||
              currentValue.length !== 42
            ) {
              this.logger.log(
                `Invalid address format: ${currentValue}, will override`,
              );
              needsOverride = true;
            }
          }

          // Special validation for URLs
          if (
            paramName.toLowerCase().includes('url') ||
            paramName.toLowerCase().includes('link')
          ) {
            if (!currentValue.startsWith('http')) {
              needsOverride = true;
            }
          }

          // Special validation for emails
          if (
            paramName.toLowerCase().includes('email') ||
            paramName.toLowerCase().includes('mail')
          ) {
            if (!currentValue.includes('@')) {
              needsOverride = true;
            }
          }
        }

        if (needsOverride && previousResults.size > 0) {
          const extractedValue = this.extractValueFromPreviousResults(
            paramName,
            schema,
            previousResults,
            toolName,
          );

          if (extractedValue !== null) {
            enhancedParameters[paramName] = extractedValue;
            this.logger.log(
              `Enhanced parameter ${paramName} with value from previous results: ${extractedValue}`,
            );
          } else {
            // Generate intelligent default if no previous result available
            const defaultValue = this.generateIntelligentDefault(
              paramName,
              schema,
              '',
            );
            if (defaultValue !== null) {
              enhancedParameters[paramName] = defaultValue;
              this.logger.log(
                `Generated intelligent default for ${paramName}: ${defaultValue}`,
              );
            }
          }
        } else if (needsOverride) {
          // No previous results available, generate intelligent default
          const defaultValue = this.generateIntelligentDefault(
            paramName,
            schema,
            '',
          );
          if (defaultValue !== null) {
            enhancedParameters[paramName] = defaultValue;
            this.logger.log(
              `Generated intelligent default for ${paramName}: ${defaultValue}`,
            );
          }
        }
      }
    }

    return enhancedParameters;
  }

  /**
   * Extract value from previous tool results based on parameter name and schema
   */
  private extractValueFromPreviousResults(
    paramName: string,
    paramSchema: any,
    previousResults: Map<string, any>,
    currentToolName: string,
  ): any {
    // Enhanced extraction patterns for all common parameter types
    const extractionPatterns = [
      // For wallet addresses - look for get_address results
      {
        paramName: 'address',
        sourceTools: ['get_address'],
        extractionMethod: (result: any) => {
          if (result?.result?.[0]?.text) {
            const addressText = result.result[0].text;
            return addressText.replace(/^"|"$/g, '');
          }
          return null;
        },
      },
      // For chain information - look for get_chain results
      {
        paramName: 'chain',
        sourceTools: ['get_chain'],
        extractionMethod: (result: any) => {
          if (result?.result?.[0]?.text) {
            return result.result[0].text.replace(/^"|"$/g, '');
          }
          return null;
        },
      },
      // For balance information - look for get_balance results
      {
        paramName: 'balance',
        sourceTools: ['get_balance'],
        extractionMethod: (result: any) => {
          if (result?.result?.[0]?.text) {
            return result.result[0].text.replace(/^"|"$/g, '');
          }
          return null;
        },
      },
      // For message parameters - generate intelligent defaults
      {
        paramName: 'message',
        sourceTools: ['*'],
        extractionMethod: (result: any) => {
          // Generate a meaningful message based on context
          return 'Hello, this is a test message for signing.';
        },
      },
      // For text parameters - extract from any tool result
      {
        paramName: 'text',
        sourceTools: ['*'],
        extractionMethod: (result: any) => {
          if (result?.result?.[0]?.text) {
            return result.result[0].text.replace(/^"|"$/g, '');
          }
          return null;
        },
      },
      // For any string parameter - try to extract from previous results
      {
        paramName: 'string',
        sourceTools: ['*'],
        extractionMethod: (result: any) => {
          if (result?.result?.[0]?.text) {
            return result.result[0].text.replace(/^"|"$/g, '');
          }
          return null;
        },
      },
    ];

    // Find matching extraction pattern
    for (const pattern of extractionPatterns) {
      if (
        pattern.paramName === paramName ||
        paramName.toLowerCase().includes(pattern.paramName.toLowerCase()) ||
        (paramSchema?.type === 'string' && pattern.paramName === 'string')
      ) {
        // Try to extract from any of the source tools
        for (const sourceTool of pattern.sourceTools) {
          for (const [toolName, result] of previousResults.entries()) {
            if (sourceTool === '*' || toolName === sourceTool) {
              const extractedValue = pattern.extractionMethod(result);
              if (extractedValue !== null) {
                return this.convertValueToType(extractedValue, paramSchema);
              }
            }
          }
        }
      }
    }

    // Fallback: try to extract any meaningful text from previous results
    for (const [toolName, result] of previousResults.entries()) {
      if (result?.result?.[0]?.text) {
        const text = result.result[0].text.replace(/^"|"$/g, '');
        if (text && text.length > 0) {
          // Check if this text is appropriate for the parameter type
          if (this.isValidParameterValue(text, paramName, paramSchema)) {
            return this.convertValueToType(text, paramSchema);
          }
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
   * Generate intelligent default based on parameter type and context
   */
  private generateIntelligentDefault(
    paramName: string,
    paramSchema: any,
    fullReasoning: string,
  ): any {
    const paramNameLower = paramName.toLowerCase();
    const paramType = paramSchema?.type || 'string';

    // Message parameters - generate meaningful defaults
    if (paramNameLower.includes('message') || paramNameLower.includes('text')) {
      if (paramNameLower.includes('sign')) {
        return 'Hello, this is a test message for signing.';
      }
      return 'Test message';
    }

    // Address parameters - look for context clues
    if (paramNameLower.includes('address')) {
      // Check if there's any mention of wallet or address in the reasoning
      if (
        fullReasoning.includes('wallet') ||
        fullReasoning.includes('address')
      ) {
        // Return a placeholder that will be filled by tool chaining
        return '[wallet_address]';
      }
    }

    // URL parameters
    if (paramNameLower.includes('url') || paramNameLower.includes('link')) {
      return 'https://example.com';
    }

    // Number parameters
    if (paramType === 'number' || paramType === 'integer') {
      return 0;
    }

    // Boolean parameters
    if (paramType === 'boolean') {
      return false;
    }

    // String parameters
    if (paramType === 'string') {
      return 'default_value';
    }

    return null;
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
   * Validate if a parameter value is appropriate for the parameter
   */
  private isValidParameterValue(
    value: string,
    paramName: string,
    paramSchema: any,
  ): boolean {
    if (!value || value.trim() === '') {
      return false;
    }

    const paramNameLower = paramName.toLowerCase();
    const paramType = paramSchema?.type || 'string';

    // Check for invalid patterns that indicate poor extraction
    const invalidPatterns = [
      /^\[.*\]$/, // [placeholder] style
      /^\{.*\}$/, // {placeholder} style
      /^`.*`$/, // `placeholder` style
      /^".*"$/, // "placeholder" style
      /^'.*'$/, // 'placeholder' style
      /^placeholder$/i,
      /^default$/i,
      /^balance$/i,
      /^retrieved_.*$/i, // retrieved_address, retrieved_value, etc.
      /^\[.*\]`$/, // [retrieved_address]` style
      /^\{.*\}`$/, // {retrieved_address}` style
      /^".*"`$/, // "retrieved_address"` style
      /^'.*'`$/, // 'retrieved_address'` style
      /^`.*"$/, // `retrieved_address" style
      /^`.*'$/, // `retrieved_address' style
      /^".*`$/, // "retrieved_address` style
      /^'.*`$/, // 'retrieved_address` style
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(value)) {
        this.logger.log(
          `Rejected invalid parameter value: ${value} (matches pattern: ${pattern})`,
        );
        return false;
      }
    }

    // Validate Ethereum addresses
    if (
      paramNameLower.includes('address') &&
      paramNameLower.includes('wallet')
    ) {
      return /^0x[a-fA-F0-9]{40}$/.test(value);
    }

    // Validate URLs
    if (paramNameLower.includes('url') || paramNameLower.includes('link')) {
      return /^https?:\/\/.+/.test(value);
    }

    // Validate emails
    if (paramNameLower.includes('email') || paramNameLower.includes('mail')) {
      return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(value);
    }

    // Validate numbers
    if (paramType === 'number' || paramType === 'integer') {
      return !isNaN(parseFloat(value));
    }

    // Validate booleans
    if (paramType === 'boolean') {
      return /^(true|false|yes|no|on|off)$/i.test(value);
    }

    // For strings, check it's not empty and not a placeholder
    if (paramType === 'string') {
      return (
        value.length > 0 &&
        !value.includes('placeholder') &&
        !value.includes('default') &&
        !value.includes('retrieved_') &&
        !value.includes('[retrieved_') &&
        !value.includes('{retrieved_') &&
        !value.includes('"retrieved_') &&
        !value.includes("'retrieved_") &&
        !value.includes('`retrieved_')
      );
    }

    return true;
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
