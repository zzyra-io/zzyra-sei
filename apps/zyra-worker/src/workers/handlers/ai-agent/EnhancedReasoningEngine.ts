import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { ThinkingStep, ReasoningResult, ReasoningParams } from '@zyra/types';

interface SequentialThinkingRequest {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
}

interface SequentialThinkingResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

interface SequentialThinkingResult {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  reasoning: string;
  confidence?: number;
  recommendations?: string[];
}

@Injectable()
export class EnhancedReasoningEngine {
  private readonly logger = new Logger(EnhancedReasoningEngine.name);
  private sequentialThinkingProcess: ChildProcess | null = null;
  private isProcessReady = false;
  private requestCounter = 0;
  private pendingRequests = new Map<
    string,
    { resolve: Function; reject: Function }
  >();

  constructor() {
    this.initializeSequentialThinking();
  }

  private async initializeSequentialThinking(): Promise<void> {
    try {
      this.logger.log('Initializing Sequential Thinking MCP server...');

      this.sequentialThinkingProcess = spawn(
        'npx',
        ['-y', '@modelcontextprotocol/server-sequential-thinking'],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            DISABLE_THOUGHT_LOGGING: 'false',
          },
        },
      );

      this.sequentialThinkingProcess.stderr?.on('data', (data) => {
        this.logger.debug(`Sequential Thinking stderr: ${data}`);
      });

      this.sequentialThinkingProcess.stdout?.on('data', (data) => {
        this.handleSequentialThinkingResponse(data.toString());
      });

      this.sequentialThinkingProcess.on('error', (error) => {
        this.logger.error('Sequential Thinking process error:', error);
        this.isProcessReady = false;
      });

      this.sequentialThinkingProcess.on('exit', (code) => {
        this.logger.warn(
          `Sequential Thinking process exited with code ${code}`,
        );
        this.isProcessReady = false;
      });

      // Initialize the MCP server
      await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'init',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          clientInfo: {
            name: 'zyra-worker',
            version: '1.0.0',
          },
        },
      });

      this.isProcessReady = true;
      this.logger.log(
        'Sequential Thinking MCP server initialized successfully',
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize Sequential Thinking MCP server:',
        error,
      );
      throw error;
    }
  }

  private handleSequentialThinkingResponse(data: string): void {
    try {
      const lines = data.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const response = JSON.parse(line);

          if (response.id && this.pendingRequests.has(response.id)) {
            const { resolve, reject } = this.pendingRequests.get(response.id)!;
            this.pendingRequests.delete(response.id);

            if (response.error) {
              reject(
                new Error(
                  response.error.message || 'Sequential thinking error',
                ),
              );
            } else {
              resolve(response.result);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error parsing Sequential Thinking response:', error);
    }
  }

  private async sendMCPRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (
        !this.sequentialThinkingProcess ||
        !this.sequentialThinkingProcess.stdin
      ) {
        reject(new Error('Sequential Thinking process not available'));
        return;
      }

      const id = request.id || `req_${this.requestCounter++}`;
      const requestWithId = { ...request, id };

      this.pendingRequests.set(id, { resolve, reject });

      // Set timeout for the request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Sequential thinking request timeout'));
        }
      }, 30000);

      const requestJson = JSON.stringify(requestWithId) + '\n';
      this.logger.debug('Sending MCP request:', requestJson);

      this.sequentialThinkingProcess.stdin.write(requestJson);
    });
  }

  private async callSequentialThinking(
    params: SequentialThinkingRequest,
  ): Promise<SequentialThinkingResponse> {
    if (!this.isProcessReady) {
      await this.initializeSequentialThinking();
    }

    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'sequential_thinking',
        arguments: params,
      },
    };

    return await this.sendMCPRequest(request);
  }

  async processWithSequentialThinking(
    params: ReasoningParams,
  ): Promise<ReasoningResult> {
    const startTime = Date.now();
    const steps: ThinkingStep[] = [];
    const sessionId = randomUUID();

    try {
      this.logger.log(
        `[Enhanced ReasoningEngine] Starting sequential thinking for prompt: "${params.prompt.substring(0, 100)}..."`,
      );

      let currentThought = 1;
      let totalThoughts = Math.min(params.maxSteps || 10, 15); // Cap at 15 thoughts
      let nextThoughtNeeded = true;
      let currentReasoning = `Analyzing the user's request: "${params.prompt}"`;

      // Intelligent tool analysis - analyze which tools are likely needed
      if (params.tools && params.tools.length > 0) {
        const toolAnalysis = await this.analyzeRequiredTools(
          params.prompt,
          params.tools,
        );
        currentReasoning += `\n\nIntelligent Tool Analysis:\n${toolAnalysis.analysis}`;
        currentReasoning += `\n\nRecommended Tools: ${toolAnalysis.recommendedTools.map((t) => `${t.name} (confidence: ${t.confidence}%)`).join(', ')}`;
        currentReasoning += `\n\nAll Available Tools: ${params.tools.map((t) => t.name).join(', ')}`;
      }

      while (nextThoughtNeeded && currentThought <= totalThoughts) {
        try {
          const thinkingRequest: SequentialThinkingRequest = {
            thought: currentReasoning,
            nextThoughtNeeded: currentThought < totalThoughts,
            thoughtNumber: currentThought,
            totalThoughts: totalThoughts,
            needsMoreThoughts: currentThought < totalThoughts,
          };

          this.logger.debug(
            `[Enhanced ReasoningEngine] Processing thought ${currentThought}/${totalThoughts}`,
          );

          const response = await this.callSequentialThinking(thinkingRequest);

          if (response.content && response.content.length > 0) {
            const thoughtContent = response.content[0].text;

            // Parse the sequential thinking result
            const result = this.parseSequentialThinkingResult(
              thoughtContent,
              currentThought,
            );

            const thinkingStep: ThinkingStep = {
              step: currentThought,
              type: this.getThinkingStepType(
                currentThought,
                totalThoughts,
              ) as any,
              reasoning: result.reasoning || thoughtContent,
              confidence: result.confidence || 0.8,
              timestamp: new Date().toISOString(),
              recommendations: result.recommendations,
            };

            steps.push(thinkingStep);

            // Update for next iteration
            currentThought++;
            nextThoughtNeeded =
              result.nextThoughtNeeded && currentThought <= totalThoughts;

            if ((result as any).needsMoreThoughts && totalThoughts < 15) {
              totalThoughts = Math.min(totalThoughts + 2, 15);
            }

            // Prepare reasoning for next thought
            currentReasoning = this.generateNextThoughtReasoning(
              result,
              params,
              currentThought,
            );
          } else {
            // If no valid response, create a fallback step
            const fallbackStep: ThinkingStep = {
              step: currentThought,
              type: 'reasoning',
              reasoning: `Continuing analysis for step ${currentThought}: ${currentReasoning}`,
              confidence: 0.6,
              timestamp: new Date().toISOString(),
            };
            steps.push(fallbackStep);
            break;
          }
        } catch (stepError) {
          this.logger.warn(
            `Error in thinking step ${currentThought}:`,
            stepError,
          );

          // Create error recovery step
          const errorStep: ThinkingStep = {
            step: currentThought,
            type: 'error_recovery',
            reasoning: `Encountered an issue in step ${currentThought}, continuing with fallback reasoning: ${currentReasoning}`,
            confidence: 0.5,
            timestamp: new Date().toISOString(),
          };
          steps.push(errorStep);
          break;
        }
      }

      // Add final conclusion step
      const conclusionStep: ThinkingStep = {
        step: steps.length + 1,
        type: 'conclusion',
        reasoning: this.generateConclusion(params, steps),
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      };
      steps.push(conclusionStep);

      // Execute the actual AI call with the accumulated reasoning
      const executionResult = await this.executeWithAI(params, steps);

      this.logger.log(
        `[Enhanced ReasoningEngine] Sequential thinking completed with ${steps.length} steps`,
      );

      return {
        thinkingSteps: steps,
        executionResult,
      };
    } catch (error) {
      this.logger.error(
        '[Enhanced ReasoningEngine] Sequential thinking failed:',
        error,
      );

      // Create fallback thinking steps
      const fallbackSteps = this.createFallbackThinkingSteps(
        params,
        error as Error,
      );
      const executionResult = await this.executeWithAI(params, fallbackSteps);

      return {
        thinkingSteps: fallbackSteps,
        executionResult,
      };
    }
  }

  private parseSequentialThinkingResult(
    content: string,
    thoughtNumber: number,
  ): SequentialThinkingResult {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      return {
        thought: parsed.thought || content,
        thoughtNumber,
        totalThoughts: parsed.totalThoughts || 10,
        nextThoughtNeeded: parsed.nextThoughtNeeded !== false,
        reasoning: parsed.reasoning || content,
        confidence: parsed.confidence || 0.8,
        recommendations: parsed.recommendations,
      };
    } catch {
      // If not JSON, treat as plain text
      return {
        thought: content,
        thoughtNumber,
        totalThoughts: 10,
        nextThoughtNeeded: true,
        reasoning: content,
        confidence: 0.7,
      };
    }
  }

  private getThinkingStepType(step: number, total: number): string {
    if (step === 1) return 'planning';
    if (step === 2) return 'analysis';
    if (step === total) return 'conclusion';
    if (step <= Math.ceil(total * 0.3)) return 'exploration';
    if (step >= Math.ceil(total * 0.7)) return 'synthesis';
    return 'reasoning';
  }

  private generateNextThoughtReasoning(
    result: SequentialThinkingResult,
    params: ReasoningParams,
    nextStep: number,
  ): string {
    const baseReasoning = `Building on previous insights from step ${result.thoughtNumber}: ${result.reasoning.substring(0, 200)}...`;

    if (nextStep <= 3) {
      return `${baseReasoning}\n\nNow focusing on: Understanding the core requirements and available resources.`;
    } else if (nextStep <= 6) {
      return `${baseReasoning}\n\nNow focusing on: Developing potential approaches and evaluating options.`;
    } else {
      return `${baseReasoning}\n\nNow focusing on: Finalizing the solution and preparing for execution.`;
    }
  }

  private generateConclusion(
    params: ReasoningParams,
    steps: ThinkingStep[],
  ): string {
    const keyInsights = steps
      .filter((step) => step.confidence && step.confidence > 0.7)
      .map((step) => step.reasoning.substring(0, 100))
      .slice(0, 3);

    return (
      `Sequential thinking analysis complete. Key insights: ${keyInsights.join('; ')}. ` +
      `Ready to execute the requested task: "${params.prompt.substring(0, 100)}..." ` +
      `with ${params.tools.length} available tools.`
    );
  }

  private createFallbackThinkingSteps(
    params: ReasoningParams,
    error: Error,
  ): ThinkingStep[] {
    return [
      {
        step: 1,
        type: 'fallback_planning',
        reasoning: `Sequential thinking unavailable (${error.message}). Using fallback reasoning for: "${params.prompt.substring(0, 100)}..."`,
        confidence: 0.6,
        timestamp: new Date().toISOString(),
      },
      {
        step: 2,
        type: 'fallback_analysis',
        reasoning: `Analyzing request with ${params.tools.length} available tools. Will proceed with standard execution flow.`,
        confidence: 0.7,
        timestamp: new Date().toISOString(),
      },
      {
        step: 3,
        type: 'fallback_execution',
        reasoning:
          'Proceeding with task execution using available tools and standard reasoning patterns.',
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  private async executeWithAI(
    params: ReasoningParams,
    steps: ThinkingStep[],
  ): Promise<any> {
    // This will be called by the main AI agent handler
    // For now, we just return the thinking context
    const reasoning = steps
      .map((step) => `Step ${step.step} (${step.type}): ${step.reasoning}`)
      .join('\n\n');

    return {
      reasoning,
      steps: steps.length,
      confidence:
        steps.reduce((acc, step) => acc + (step.confidence || 0.7), 0) /
        steps.length,
    };
  }

  /**
   * Intelligently analyze which tools are required for the given prompt
   */
  private async analyzeRequiredTools(
    prompt: string,
    availableTools: any[],
  ): Promise<{
    analysis: string;
    recommendedTools: Array<{
      name: string;
      confidence: number;
      reason: string;
      suggestedParams: any;
    }>;
  }> {
    try {
      const toolCategories = this.categorizeTools(availableTools);
      const promptKeywords = this.extractKeywords(prompt.toLowerCase());
      const recommendedTools: Array<{
        name: string;
        confidence: number;
        reason: string;
        suggestedParams: any;
      }> = [];

      // Analyze prompt intent and match with tool capabilities
      const analysis = this.generateToolAnalysis(
        prompt,
        promptKeywords,
        toolCategories,
      );

      // Score and recommend tools based on prompt analysis
      for (const tool of availableTools) {
        const score = this.calculateToolRelevanceScore(
          prompt,
          promptKeywords,
          tool,
        );
        if (score.confidence >= 60) {
          // Only recommend tools with >60% confidence
          recommendedTools.push({
            name: tool.name,
            confidence: score.confidence,
            reason: score.reason,
            suggestedParams: this.suggestToolParameters(prompt, tool),
          });
        }
      }

      // Sort by confidence descending
      recommendedTools.sort((a, b) => b.confidence - a.confidence);

      return {
        analysis,
        recommendedTools: recommendedTools.slice(0, 5), // Top 5 recommendations
      };
    } catch (error) {
      this.logger.warn('Tool analysis failed, using fallback:', error);
      return {
        analysis: 'Using standard tool selection due to analysis error.',
        recommendedTools: availableTools.slice(0, 3).map((tool) => ({
          name: tool.name,
          confidence: 50,
          reason: 'Fallback recommendation',
          suggestedParams: {},
        })),
      };
    }
  }

  private categorizeTools(tools: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      blockchain: [],
      defi: [],
      search: [],
      data: [],
      communication: [],
      analytics: [],
      utilities: [],
    };

    for (const tool of tools) {
      const toolName = tool.name.toLowerCase();
      const toolDesc = (tool.description || '').toLowerCase();

      if (
        toolName.includes('wallet') ||
        toolName.includes('balance') ||
        toolName.includes('transaction') ||
        toolDesc.includes('blockchain') ||
        toolDesc.includes('crypto')
      ) {
        categories.blockchain.push(tool);
      } else if (
        toolName.includes('swap') ||
        toolName.includes('defi') ||
        toolName.includes('liquidity') ||
        toolDesc.includes('defi') ||
        toolDesc.includes('uniswap')
      ) {
        categories.defi.push(tool);
      } else if (
        toolName.includes('search') ||
        toolName.includes('brave') ||
        toolDesc.includes('search')
      ) {
        categories.search.push(tool);
      } else if (
        toolName.includes('data') ||
        toolName.includes('fetch') ||
        toolDesc.includes('api')
      ) {
        categories.data.push(tool);
      } else if (
        toolName.includes('analytics') ||
        toolName.includes('monitor') ||
        toolName.includes('track')
      ) {
        categories.analytics.push(tool);
      } else {
        categories.utilities.push(tool);
      }
    }

    return categories;
  }

  private extractKeywords(prompt: string): string[] {
    const keywords = [
      // Blockchain keywords
      'wallet',
      'balance',
      'transaction',
      'crypto',
      'blockchain',
      'ethereum',
      'sei',
      'gas',
      // DeFi keywords
      'swap',
      'trade',
      'defi',
      'liquidity',
      'pool',
      'yield',
      'farm',
      'lending',
      'arbitrage',
      // Search keywords
      'search',
      'find',
      'lookup',
      'query',
      'information',
      // Action keywords
      'get',
      'fetch',
      'retrieve',
      'analyze',
      'monitor',
      'track',
      'check',
      'calculate',
    ];

    return keywords.filter((keyword) => prompt.includes(keyword));
  }

  private generateToolAnalysis(
    prompt: string,
    keywords: string[],
    categories: Record<string, any[]>,
  ): string {
    const detectedIntents = [];

    if (
      keywords.some((k) =>
        ['wallet', 'balance', 'transaction', 'crypto'].includes(k),
      )
    ) {
      detectedIntents.push('Blockchain Operations');
    }
    if (
      keywords.some((k) => ['swap', 'defi', 'liquidity', 'trade'].includes(k))
    ) {
      detectedIntents.push('DeFi Operations');
    }
    if (keywords.some((k) => ['search', 'find', 'lookup'].includes(k))) {
      detectedIntents.push('Information Retrieval');
    }
    if (keywords.some((k) => ['analyze', 'monitor', 'track'].includes(k))) {
      detectedIntents.push('Analytics & Monitoring');
    }

    return (
      `Detected Intent: ${detectedIntents.join(', ') || 'General Task'}\n` +
      `Key Keywords: ${keywords.join(', ')}\n` +
      `Available Tool Categories: ${Object.keys(categories)
        .filter((cat) => categories[cat].length > 0)
        .join(', ')}`
    );
  }

  private calculateToolRelevanceScore(
    prompt: string,
    keywords: string[],
    tool: any,
  ): { confidence: number; reason: string } {
    let score = 0;
    const reasons = [];

    const toolName = tool.name.toLowerCase();
    const toolDesc = (tool.description || '').toLowerCase();

    // Direct keyword matches in tool name (high weight)
    for (const keyword of keywords) {
      if (toolName.includes(keyword)) {
        score += 25;
        reasons.push(`tool name contains "${keyword}"`);
      }
      if (toolDesc.includes(keyword)) {
        score += 15;
        reasons.push(`description matches "${keyword}"`);
      }
    }

    // Contextual analysis
    if (
      prompt.includes('balance') &&
      (toolName.includes('balance') || toolName.includes('wallet'))
    ) {
      score += 30;
      reasons.push('balance query detected');
    }

    if (
      prompt.includes('swap') &&
      (toolName.includes('swap') || toolName.includes('uniswap'))
    ) {
      score += 30;
      reasons.push('swap operation detected');
    }

    if (prompt.includes('search') && toolName.includes('search')) {
      score += 35;
      reasons.push('search operation detected');
    }

    // Cap at 100%
    score = Math.min(score, 100);

    return {
      confidence: score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'general relevance',
    };
  }

  private suggestToolParameters(prompt: string, tool: any): any {
    const suggestedParams: any = {};

    // Extract potential addresses from prompt
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    if (
      addressMatch &&
      (tool.name.includes('balance') || tool.name.includes('transaction'))
    ) {
      suggestedParams.address = addressMatch[0];
    }

    // Extract numbers that might be amounts or limits
    const numberMatch = prompt.match(/\b(\d+(?:\.\d+)?)\b/);
    if (numberMatch) {
      if (tool.name.includes('transaction') || tool.name.includes('history')) {
        suggestedParams.limit = Math.min(parseInt(numberMatch[1]) || 10, 100);
      }
      if (tool.name.includes('swap') || tool.name.includes('amount')) {
        suggestedParams.amount = numberMatch[1];
      }
    }

    // Token symbols
    const tokenMatch = prompt.match(/\b(ETH|USDC|SEI|BTC|USDT)\b/i);
    if (
      tokenMatch &&
      (tool.name.includes('token') || tool.name.includes('swap'))
    ) {
      suggestedParams.token = tokenMatch[1].toUpperCase();
    }

    return suggestedParams;
  }

  async cleanup(): Promise<void> {
    if (this.sequentialThinkingProcess) {
      this.logger.log('Shutting down Sequential Thinking MCP server...');
      this.sequentialThinkingProcess.kill();
      this.sequentialThinkingProcess = null;
      this.isProcessReady = false;
    }
  }
}
