"use client"
import { AIAgentConfig } from "@zyra/types"
import { AIAgentBlock } from "@/components/blocks/ai-agent-block"

interface BlockConfigComponent {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
  executionStatus?: "idle" | "running" | "success" | "error" | "warning"
  executionData?: {
    startTime?: string
    endTime?: string
    duration?: number
    error?: string
    lastResponse?: Record<string, unknown>
  }
  onTest?: () => void
}

export function AIAgentConfigComponent({ 
  config, 
  onChange,
  executionStatus,
  executionData,
  onTest 
}: BlockConfigComponent) {
  const handleChange = (newConfig: AIAgentConfig) => {
    onChange(newConfig as Record<string, unknown>)
  }

  return (
    <AIAgentBlock
      config={config as AIAgentConfig}
      onChange={handleChange}
    />
  )
}