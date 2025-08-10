import { AIAgentConfig, AIAgentExecution, MCPServerConfig } from "@zzyra/types";
import api from "../services/api";

export class AIAgentAPI {
  static async getMCPServers(): Promise<MCPServerConfig[]> {
    const response = await api.get(`/ai-agent/mcp-servers`);
    if (response.status !== 200) throw new Error("Failed to fetch MCP servers");
    return response.data;
  }

  static async getMCPServersByCategory(): Promise<
    Record<string, MCPServerConfig[]>
  > {
    const response = await api.get(`/ai-agent/mcp-servers/categories`);
    if (response.status !== 200)
      throw new Error("Failed to fetch MCP server categories");
    return response.data;
  }

  static async testMCPServer(
    serverId: string,
    config: Record<string, any>
  ): Promise<{ success: boolean; tools: any[] }> {
    const response = await api.post(`/ai-agent/mcp-servers/${serverId}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    if (response.status !== 200) throw new Error("Failed to test MCP server");
    return response.data;
  }

  static async executeAgent(
    config: AIAgentConfig
  ): Promise<{ executionId: string }> {
    const response = await api.post(`/ai-agent/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (response.status !== 200) throw new Error("Failed to execute AI agent");
    return response.data;
  }

  static async getExecution(executionId: string): Promise<AIAgentExecution> {
    const response = await api.get(`/ai-agent/executions/${executionId}`);
    if (response.status !== 200) throw new Error("Failed to fetch execution");
    return response.data;
  }

  static async stopExecution(executionId: string): Promise<void> {
    const response = await api.post(`/ai-agent/executions/${executionId}/stop`);
    if (response.status !== 200) throw new Error("Failed to stop execution");
  }

  static createExecutionStream(executionId: string): EventSource {
    return new EventSource(`/ai-agent/executions/${executionId}/stream`);
  }
}
