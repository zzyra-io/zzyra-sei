"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Brain, Settings } from "lucide-react"
import { AIAgentConfig, SelectedTool } from "@zyra/types"
import { useState } from "react"
import { AIAgentToolsSelector } from "./ai-agent-tools-selector"

const DEFAULT_CONFIG: AIAgentConfig = {
  provider: {
    type: 'openrouter',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
  },
  agent: {
    name: 'AI Assistant',
    systemPrompt: 'You are a helpful AI assistant with access to various tools. Always explain what you are doing and why.',
    userPrompt: '',
    maxSteps: 10,
    thinkingMode: 'deliberate',
  },
  selectedTools: [],
  execution: {
    mode: 'autonomous',
    timeout: 120000,
    requireApproval: false,
    saveThinking: true,
  },
}

const PROVIDER_MODELS = {
  openrouter: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'google/gemini-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  ollama: ['llama3.1', 'mistral', 'codellama'],
}


export function AIAgentBlock({
  config = DEFAULT_CONFIG,
  onChange,
}: {
  config: AIAgentConfig
  onChange?: (config: AIAgentConfig) => void
}) {

  const handleChange = (updates: Partial<AIAgentConfig>) => {
    if (onChange) {
      onChange({ ...config, ...updates })
    }
  }

  const handleProviderChange = (updates: Partial<AIAgentConfig['provider']>) => {
    handleChange({ provider: { ...config.provider, ...updates } })
  }

  const handleAgentChange = (updates: Partial<AIAgentConfig['agent']>) => {
    handleChange({ agent: { ...config.agent, ...updates } })
  }

  const handleExecutionChange = (updates: Partial<AIAgentConfig['execution']>) => {
    handleChange({ execution: { ...config.execution, ...updates } })
  }

  const handleToolsChange = (tools: SelectedTool[]) => {
    handleChange({ selectedTools: tools })
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <CardTitle>AI Agent</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Configuration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">LLM Provider</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={config.provider.type}
              onValueChange={(value: any) => handleProviderChange({ type: value, model: PROVIDER_MODELS[value][0] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={config.provider.model}
              onValueChange={(value) => handleProviderChange({ model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_MODELS[config.provider.type].map((model) => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Agent Configuration */}
        <div className="space-y-2">
          <Label>Agent Name</Label>
          <Input
            value={config.agent.name}
            onChange={(e) => handleAgentChange({ name: e.target.value })}
            placeholder="AI Assistant"
          />
        </div>

        <div className="space-y-2">
          <Label>System Prompt</Label>
          <Textarea
            value={config.agent.systemPrompt}
            onChange={(e) => handleAgentChange({ systemPrompt: e.target.value })}
            placeholder="You are a helpful AI assistant..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>User Prompt</Label>
          <Textarea
            value={config.agent.userPrompt}
            onChange={(e) => handleAgentChange({ userPrompt: e.target.value })}
            placeholder="What would you like me to help you with?"
            rows={2}
          />
        </div>

        {/* Thinking Mode */}
        <div className="space-y-2">
          <Label>Thinking Mode</Label>
          <Select
            value={config.agent.thinkingMode}
            onValueChange={(value: any) => handleAgentChange({ thinkingMode: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">Fast</SelectItem>
              <SelectItem value="deliberate">Deliberate</SelectItem>
              <SelectItem value="collaborative">Collaborative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Tools Selector */}
        <div className="space-y-2">
          <Label>Tools</Label>
          <AIAgentToolsSelector
            selectedTools={config.selectedTools}
            onToolsChange={handleToolsChange}
          />
        </div>

        {/* Execution Settings */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Execution Settings
          </Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Save Thinking Process</Label>
              <Switch
                checked={config.execution.saveThinking}
                onCheckedChange={(checked) => handleExecutionChange({ saveThinking: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require Approval</Label>
              <Switch
                checked={config.execution.requireApproval}
                onCheckedChange={(checked) => handleExecutionChange({ requireApproval: checked })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}