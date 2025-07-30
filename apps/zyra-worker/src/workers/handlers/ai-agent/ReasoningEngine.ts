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
          const errorMessage = error instanceof Error ? error.message : String(error);
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
          `Executing selected tools: ${selectedTools.join(', ')}`,
        );

        // Execute the selected tools with analytics tracking
        const toolResults = [];
        for (const toolEntry of selectedTools) {
          const tool = params.tools.find((t) => t.id === toolEntry.name);
          if (tool && tool.execute) {
            const startTime = Date.now();
            try {
              this.logger.log(
                `Executing tool: ${toolEntry.name} with parameters:`,
                toolEntry.parameters || {},
              );

              // Check cache first
              const cacheKey = {
                toolName: toolEntry.name,
                parameters: toolEntry.parameters || {},
                userId: params.userId || 'anonymous',
              };

              let toolResult =
                await this.cacheService.getCachedToolResult(cacheKey);
              const fromCache = !!toolResult;

              if (!toolResult) {
                toolResult = await tool.execute(toolEntry.parameters || {});
                // Cache successful results
                await this.cacheService.cacheToolResult(cacheKey, toolResult);
              }

              const responseTime = Date.now() - startTime;
              toolResults.push({
                tool: toolEntry.name,
                result: toolResult,
                fromCache,
                responseTime,
              });

              // Record analytics
              this.toolAnalyticsService.recordToolUsage({
                toolName: toolEntry.name,
                userId: params.userId || 'anonymous',
                sessionId: params.sessionId,
                executionId: params.sessionId, // Use sessionId as executionId for now
                parameters: toolEntry.parameters || {},
                result: toolResult,
                success: true,
                responseTime,
                context: {
                  provider: 'unknown', // Would be passed from provider
                  model: 'unknown', // Would be passed from provider
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
        }

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
      const match = pattern.exec(toolContext) || pattern.exec(fullReasoning);
      if (match) {
        return this.convertValueToType(match[1].trim(), paramSchema);
      }
    }

    // Strategy 2: Content-based extraction based on parameter name and type
    if (
      paramName.toLowerCase().includes('query') ||
      paramName.toLowerCase().includes('sql') ||
      paramName === 'sql'
    ) {
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

      // Look for SQL-like content anywhere in the text (only for SQL parameters)
      if (
        paramName.toLowerCase() === 'sql' ||
        paramName.toLowerCase() === 'query'
      ) {
        const sqlMatch = fullReasoning.match(
          /(SELECT|INSERT|UPDATE|DELETE|SHOW|DESCRIBE|CREATE|DROP|ALTER)[\s\S]*?(?=;|\.|$|```)/i,
        );
        if (sqlMatch) {
          const sqlQuery = sqlMatch[0].trim().replace(/[;.]$/, '');
          this.logger.log(`Found SQL statement: ${sqlQuery}`);
          return sqlQuery;
        }
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

      // Look for question-like queries as fallback
      const queryMatch = fullReasoning.match(
        /(?:find|search|show|get|list|what|how|when|where)[\s\S]*?(?=[.?!]|$)/i,
      );
      if (queryMatch) {
        return queryMatch[0].trim().replace(/[.?!]$/, '');
      }
    }

    if (paramName.toLowerCase().includes('address')) {
      // Look for blockchain addresses
      const addressMatch = fullReasoning.match(/(0x[a-fA-F0-9]{40})/);
      if (addressMatch) {
        return addressMatch[1];
      }
    }

    if (
      paramName.toLowerCase().includes('path') ||
      paramName.toLowerCase().includes('file')
    ) {
      // Look for file paths
      const pathMatch = fullReasoning.match(
        /([\/\w.-]+\.[a-zA-Z]{2,4}|\/[\w\/.-]+)/g,
      );
      if (pathMatch) {
        return pathMatch[0];
      }
    }

    if (
      paramName.toLowerCase().includes('url') ||
      paramName.toLowerCase().includes('link')
    ) {
      // Look for URLs
      const urlMatch = fullReasoning.match(/(https?:\/\/[^\s"'<>]+)/i);
      if (urlMatch) {
        return urlMatch[1];
      }
    }

    // Strategy 3: Extract from description or context clues
    if (paramSchema.description) {
      const descWords = paramSchema.description.toLowerCase().split(/\s+/);
      for (const word of descWords) {
        if (word.length > 3 && /^[a-zA-Z]+$/.test(word)) {
          // Only use alphanumeric words for regex
          try {
            const contextMatch = new RegExp(
              `\\b${this.escapeRegex(word)}\\b[\\s:]*["']?([^"'\\n,}]+)["']?`,
              'i',
            ).exec(toolContext);
            if (contextMatch) {
              return this.convertValueToType(
                contextMatch[1].trim(),
                paramSchema,
              );
            }
          } catch (error) {
            // Ignore regex errors and continue with next word
            continue;
          }
        }
      }
    }

    return null;
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
