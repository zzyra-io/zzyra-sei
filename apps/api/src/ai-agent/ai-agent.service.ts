import { Injectable } from "@nestjs/common";
import {
  AIAgentConfig,
  AIAgentExecution,
  defaultMCPs,
  MCPServerConfig,
} from "@zyra/types";
import { randomUUID } from "crypto";

@Injectable()
export class AIAgentService {
  private executions = new Map<string, AIAgentExecution>();

  // Return hardcoded MCP servers for now - these should come from database
  async getAvailableMCPServers(): Promise<any[]> {
    const mcpServers = Object.values(defaultMCPs);
    return mcpServers;
  }

  async getMCPServersByCategory(): Promise<Record<string, MCPServerConfig[]>> {
    const servers = await this.getAvailableMCPServers();
    const categories: Record<string, MCPServerConfig[]> = {};

    servers.forEach((server) => {
      if (!categories[server.category]) {
        categories[server.category] = [];
      }
      categories[server.category].push(server);
    });

    return categories;
  }

  async testMCPServer(
    serverId: string,
    config: Record<string, any>
  ): Promise<{ success: boolean; tools: any[] }> {
    // Mock test for now - in real implementation this would test the actual MCP connection
    return {
      success: true,
      tools: [
        { name: "search", description: "Search the web" },
        { name: "get_page", description: "Get page content" },
      ],
    };
  }

  async executeAgent(config: AIAgentConfig): Promise<{ executionId: string }> {
    const executionId = randomUUID();

    const execution: AIAgentExecution = {
      id: executionId,
      status: "running",
      sessionId: randomUUID(),
      startTime: new Date(),
      steps: [],
      toolCalls: [],
    };

    this.executions.set(executionId, execution);

    // Execute via real worker
    this.executeViaWorker(executionId, config);

    return { executionId };
  }

  private async executeViaWorker(executionId: string, config: AIAgentConfig) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    // Simulate execution - in real implementation this would dispatch to message queue
    this.simulateExecution(executionId, config);
  }

  async getExecution(executionId: string): Promise<AIAgentExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    return execution;
  }

  async stopExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === "running") {
      execution.status = "failed";
      execution.error = "Execution stopped by user";
      execution.endTime = new Date();
    }
  }

  getExecutionStatus(executionId: string): AIAgentExecution | null {
    return this.executions.get(executionId) || null;
  }

  private async simulateExecution(executionId: string, config: AIAgentConfig) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    try {
      // Simulate planning step
      await this.delay(2000);
      execution.steps!.push({
        step: 1,
        type: "planning",
        reasoning: `Planning to execute: ${config.agent.userPrompt}`,
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      });

      // Simulate tool selection
      if (config.selectedTools.length > 0) {
        await this.delay(1500);
        execution.steps!.push({
          step: 2,
          type: "tool_selection",
          reasoning: `Selected tools: ${config.selectedTools.map((t) => t.name).join(", ")}`,
          confidence: 0.9,
          toolsConsidered: config.selectedTools.map((t) => t.name),
          decision: `Using ${config.selectedTools.length} tools`,
          timestamp: new Date().toISOString(),
        });

        // Simulate tool execution
        await this.delay(2000);
        execution.toolCalls!.push({
          name: config.selectedTools[0].name,
          parameters: config.selectedTools[0].config,
          result: "Tool executed successfully",
          duration: 1500,
        });
      }

      // Simulate execution step
      await this.delay(3000);
      execution.steps!.push({
        step: 3,
        type: "execution",
        reasoning: "Executing the planned actions and generating response",
        confidence: 0.85,
        timestamp: new Date().toISOString(),
      });

      // Complete execution
      execution.status = "completed";
      execution.result = `I've successfully processed your request: "${config.agent.userPrompt}". Based on the analysis and tool executions, here's what I found...`;
      execution.endTime = new Date();
    } catch (error) {
      execution.status = "failed";
      execution.error =
        error instanceof Error ? error.message : "Unknown error";
      execution.endTime = new Date();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
