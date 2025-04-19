"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import type { Node } from "@/components/flow-canvas"

interface BlockConfigPanelProps {
  node: Node
  onUpdate: (node: Node) => void
  onClose: () => void
}

export function BlockConfigPanel({ node, onUpdate, onClose }: BlockConfigPanelProps) {
  const [config, setConfig] = useState<any>(node.data.config || {})
  const [label, setLabel] = useState(node.data.label || "")
  const [description, setDescription] = useState(node.data.description || "")
  const [isEnabled, setIsEnabled] = useState(node.data.isEnabled !== false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setConfig(node.data.config || {})
    setLabel(node.data.label || "")
    setDescription(node.data.description || "")
    setIsEnabled(node.data.isEnabled !== false)
  }, [node])

  if (!isMounted) {
    return null
  }

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = () => {
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        label,
        description,
        isEnabled,
        config,
      },
    }
    onUpdate(updatedNode)
  }

  const renderConfigFields = () => {
    const blockType = node.data.blockType

    switch (blockType) {
      case "database":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="connection">Database Connection</Label>
              <Input
                id="connection"
                value={config.connection || ""}
                onChange={(e) => handleConfigChange("connection", e.target.value)}
                placeholder="Connection string or name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="query">SQL Query</Label>
              <Textarea
                id="query"
                value={config.query || ""}
                onChange={(e) => handleConfigChange("query", e.target.value)}
                placeholder="SELECT * FROM table"
                rows={4}
              />
            </div>
          </>
        )
      case "webhook":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                value={config.url || ""}
                onChange={(e) => handleConfigChange("url", e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">HTTP Method</Label>
              <select
                id="method"
                value={config.method || "POST"}
                onChange={(e) => handleConfigChange("method", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </>
        )
      case "email":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                value={config.to || ""}
                onChange={(e) => handleConfigChange("to", e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={config.subject || ""}
                onChange={(e) => handleConfigChange("subject", e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                value={config.body || ""}
                onChange={(e) => handleConfigChange("body", e.target.value)}
                placeholder="Email body"
                rows={4}
              />
            </div>
          </>
        )
      case "code":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                value={config.language || "javascript"}
                onChange={(e) => handleConfigChange("language", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Textarea
                id="code"
                value={config.code || ""}
                onChange={(e) => handleConfigChange("code", e.target.value)}
                placeholder="// Your code here"
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </>
        )
      case "schedule":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="cron">Cron Expression</Label>
              <Input
                id="cron"
                value={config.cron || ""}
                onChange={(e) => handleConfigChange("cron", e.target.value)}
                placeholder="0 0 * * *"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={config.timezone || "UTC"}
                onChange={(e) => handleConfigChange("timezone", e.target.value)}
                placeholder="UTC"
              />
            </div>
          </>
        )
      case "wallet":
      case "crypto":
      case "finance":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <select
                id="network"
                value={config.network || "ethereum"}
                onChange={(e) => handleConfigChange("network", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
                <option value="solana">Solana</option>
                <option value="bitcoin">Bitcoin</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Wallet Address</Label>
              <Input
                id="address"
                value={config.address || ""}
                onChange={(e) => handleConfigChange("address", e.target.value)}
                placeholder="0x..."
              />
            </div>
          </>
        )
      case "ai":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <select
                id="model"
                value={config.model || "gpt-4"}
                onChange={(e) => handleConfigChange("model", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-2">Claude 2</option>
                <option value="llama-2">Llama 2</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={config.prompt || ""}
                onChange={(e) => handleConfigChange("prompt", e.target.value)}
                placeholder="Enter your prompt here"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature || "0.7"}
                onChange={(e) => handleConfigChange("temperature", e.target.value)}
              />
            </div>
          </>
        )
      default:
        return (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No specific configuration options for this block type.
          </div>
        )
    }
  }

  return (
    <div className="w-80 border-l bg-card p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Block Configuration</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="enabled">Enabled</Label>
          <Switch id="enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Block-specific Configuration</h4>
          {renderConfigFields()}
        </div>

        <Button className="w-full" onClick={handleSave}>
          Apply Changes
        </Button>
      </div>
    </div>
  )
}
