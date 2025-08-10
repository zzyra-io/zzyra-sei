export interface AIAgentConfig {
  provider: {
    type: "openrouter" | "openai" | "anthropic" | "ollama";
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  agent: {
    name: string;
    systemPrompt: string;
    userPrompt: string;
    maxSteps: number;
    thinkingMode: "fast" | "deliberate" | "collaborative";
  };
  selectedTools: SelectedTool[];
  execution: {
    mode: "autonomous" | "interactive";
    timeout: number;
    requireApproval: boolean;
    saveThinking: boolean;
  };
}

export interface SelectedTool {
  id: string;
  name: string;
  type: "mcp" | "goat" | "builtin";
  config: Record<string, any>;
  description?: string;
  category?: string;
  enabled?: boolean;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon?: string;
  connection: {
    type: "stdio" | "sse" | "websocket";
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
  };
  configSchema: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        required?: boolean;
        default?: any;
        sensitive?: boolean;
      }
    >;
    required?: string[];
  };
}

export interface AIAgentExecution {
  id: string;
  status: "running" | "completed" | "failed";
  result?: string;
  error?: string;
  steps?: ThinkingStep[];
  toolCalls?: ToolCall[];
  sessionId: string;
  startTime: Date;
  endTime?: Date;
}

export interface ThinkingStep {
  step: number;
  type:
    | "planning"
    | "reasoning"
    | "tool_selection"
    | "execution"
    | "reflection"
    | "conclusion"
    | "error_recovery"
    | "fallback_planning"
    | "fallback_analysis"
    | "fallback_execution";
  reasoning: string;
  confidence?: number;
  toolsConsidered?: string[];
  decision?: string;
  timestamp?: string;
  recommendations?: string[];
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
}

export interface ReasoningParams {
  prompt: string;
  systemPrompt?: string;
  tools: any[];
  maxSteps?: number;
  thinkingMode?: "fast" | "deliberate" | "collaborative";
  userId?: string;
  sessionId?: string;
}

export interface ReasoningResult {
  thinkingSteps: ThinkingStep[];
  executionResult: any;
  confidence?: number;
  reasoning?: string;
}
