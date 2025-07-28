import { AIAgentConfig, AIAgentExecution, MCPServerConfig } from '@zyra/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export class AIAgentAPI {
  static async getMCPServers(): Promise<MCPServerConfig[]> {
    const response = await fetch(`${API_BASE}/ai-agent/mcp-servers`)
    if (!response.ok) throw new Error('Failed to fetch MCP servers')
    return response.json()
  }

  static async getMCPServersByCategory(): Promise<Record<string, MCPServerConfig[]>> {
    const response = await fetch(`${API_BASE}/ai-agent/mcp-servers/categories`)
    if (!response.ok) throw new Error('Failed to fetch MCP server categories')
    return response.json()
  }

  static async testMCPServer(serverId: string, config: Record<string, any>): Promise<{ success: boolean; tools: any[] }> {
    const response = await fetch(`${API_BASE}/ai-agent/mcp-servers/${serverId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    })
    if (!response.ok) throw new Error('Failed to test MCP server')
    return response.json()
  }

  static async executeAgent(config: AIAgentConfig): Promise<{ executionId: string }> {
    const response = await fetch(`${API_BASE}/ai-agent/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error('Failed to execute AI agent')
    return response.json()
  }

  static async getExecution(executionId: string): Promise<AIAgentExecution> {
    const response = await fetch(`${API_BASE}/ai-agent/executions/${executionId}`)
    if (!response.ok) throw new Error('Failed to fetch execution')
    return response.json()
  }

  static async stopExecution(executionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/ai-agent/executions/${executionId}/stop`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to stop execution')
  }

  static createExecutionStream(executionId: string): EventSource {
    return new EventSource(`${API_BASE}/ai-agent/executions/${executionId}/stream`)
  }
}