import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';

interface ThinkingStep {
  step: number;
  type: 'planning' | 'reasoning' | 'tool_selection' | 'execution' | 'reflection';
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
}

interface ReasoningResult {
  text: string;
  steps: ThinkingStep[];
  toolCalls: any[];
  confidence: number;
  executionPath: string[];
}

@Injectable()
export class ReasoningEngine {
  private readonly logger = new Logger(ReasoningEngine.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(params: ReasoningParams): Promise<ReasoningResult> {
    const steps: ThinkingStep[] = [];
    const toolCalls: any[] = [];
    let currentStep = 1;

    try {
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

      // Step 4: Reflection (if deliberate mode)
      if (params.thinkingMode === 'deliberate') {
        const reflectionStep = await this.reflect(executionResult, currentStep++);
        steps.push(reflectionStep);
      }

      // Save thinking process
      await this.saveThinkingProcess(params.sessionId, steps);

      return {
        text: executionResult.text || executionResult.content,
        steps,
        toolCalls,
        confidence: this.calculateOverallConfidence(steps),
        executionPath: steps.map(s => s.type),
      };

    } catch (error) {
      this.logger.error('Reasoning engine execution failed:', error);
      
      // Add error step
      steps.push({
        step: currentStep,
        type: 'execution',
        reasoning: `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
        timestamp: new Date().toISOString(),
      });

      await this.saveThinkingProcess(params.sessionId, steps);
      throw error;
    }
  }

  private async planExecution(params: ReasoningParams, stepNumber: number): Promise<ThinkingStep> {
    const planningPrompt = this.buildPlanningPrompt(params);
    
    try {
      const planningResult = await params.provider.generateText({
        prompt: planningPrompt,
        systemPrompt: 'You are a planning assistant. Create a step-by-step plan.',
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

  private async selectTools(params: ReasoningParams, stepNumber: number): Promise<ThinkingStep> {
    const availableTools = params.tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
    }));

    const toolSelectionPrompt = this.buildToolSelectionPrompt(params.prompt, availableTools);

    try {
      const selectionResult = await params.provider.generateText({
        prompt: toolSelectionPrompt,
        systemPrompt: 'You are a tool selection assistant. Choose the most appropriate tools.',
        temperature: 0.2,
        maxTokens: 300,
      });

      const reasoning = selectionResult.text || selectionResult.content;
      const selectedTools = this.extractSelectedTools(reasoning, availableTools);

      return {
        step: stepNumber,
        type: 'tool_selection',
        reasoning,
        confidence: selectedTools.length > 0 ? 0.8 : 0.3,
        toolsConsidered: availableTools.map(t => t.name),
        decision: `Selected tools: ${selectedTools.join(', ')}`,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.warn('Tool selection failed:', error);
      
      return {
        step: stepNumber,
        type: 'tool_selection',
        reasoning: 'Tool selection failed, proceeding with all available tools.',
        confidence: 0.4,
        toolsConsidered: availableTools.map(t => t.name),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async executeWithProvider(
    params: ReasoningParams, 
    previousSteps: ThinkingStep[]
  ): Promise<any> {
    const context = this.buildExecutionContext(previousSteps);
    const enhancedPrompt = `${context}\n\nUser Request: ${params.prompt}`;

    return params.provider.generateText({
      prompt: enhancedPrompt,
      systemPrompt: params.systemPrompt,
      tools: params.tools,
      maxSteps: params.maxSteps,
      temperature: params.thinkingMode === 'fast' ? 0.7 : 0.5,
    });
  }

  private async reflect(executionResult: any, stepNumber: number): Promise<ThinkingStep> {
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
      const reasoning = this.generateReflectionReasoning(executionResult, confidence);

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
    const availableTools = params.tools.map(t => t.name).join(', ');
    
    return `
      Create a step-by-step plan to address this request: "${params.prompt}"
      
      Available tools: ${availableTools}
      Thinking mode: ${params.thinkingMode}
      
      Provide a clear, numbered plan with 3-5 steps.
    `;
  }

  private buildToolSelectionPrompt(prompt: string, tools: any[]): string {
    const toolsList = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
    
    return `
      For this request: "${prompt}"
      
      Available tools:
      ${toolsList}
      
      Which tools would be most helpful? Explain your reasoning and list the selected tools.
    `;
  }

  private buildExecutionContext(steps: ThinkingStep[]): string {
    const context = steps.map(step => 
      `${step.type.toUpperCase()}: ${step.reasoning}`
    ).join('\n\n');

    return `Based on the following analysis:\n\n${context}`;
  }

  private extractSelectedTools(reasoning: string, availableTools: any[]): string[] {
    const selected: string[] = [];
    
    for (const tool of availableTools) {
      if (reasoning.toLowerCase().includes(tool.name.toLowerCase())) {
        selected.push(tool.name);
      }
    }

    return selected;
  }

  private assessPlanConfidence(plan: string): number {
    // Simple heuristic based on plan structure
    const hasSteps = /\d+\.|\d+\)/.test(plan);
    const hasDetails = plan.length > 100;
    const hasLogicalFlow = plan.includes('first') || plan.includes('then') || plan.includes('finally');

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
    if (!text.toLowerCase().includes('error') && !text.toLowerCase().includes('failed')) {
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

  private calculateOverallConfidence(steps: ThinkingStep[]): number {
    if (steps.length === 0) return 0.5;

    const totalConfidence = steps.reduce((sum, step) => sum + step.confidence, 0);
    return totalConfidence / steps.length;
  }

  private async saveThinkingProcess(sessionId: string, steps: ThinkingStep[]): Promise<void> {
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