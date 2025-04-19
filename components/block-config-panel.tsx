"use client"

import { useState, useEffect } from "react"
import { X, Palette, Info, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
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
  const [activeTab, setActiveTab] = useState("general")

  // Appearance settings
  const [style, setStyle] = useState<any>(
    node.data.style || {
      backgroundColor: "bg-card",
      borderColor: "border-border",
      textColor: "text-foreground",
      accentColor: "primary",
      width: 220,
    },
  )

  // Input/Output settings
  const [inputCount, setInputCount] = useState(node.data.inputCount || 1)
  const [outputCount, setOutputCount] = useState(node.data.outputCount || 1)
  const [hasInputs, setHasInputs] = useState(node.data.inputs !== false)
  const [hasOutputs, setHasOutputs] = useState(node.data.outputs !== false)

  useEffect(() => {
    setIsMounted(true)
    setConfig(node.data.config || {})
    setLabel(node.data.label || "")
    setDescription(node.data.description || "")
    setIsEnabled(node.data.isEnabled !== false)
    setStyle(
      node.data.style || {
        backgroundColor: "bg-card",
        borderColor: "border-border",
        textColor: "text-foreground",
        accentColor: "primary",
        width: 220,
      },
    )
    setInputCount(node.data.inputCount || 1)
    setOutputCount(node.data.outputCount || 1)
    setHasInputs(node.data.inputs !== false)
    setHasOutputs(node.data.outputs !== false)
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

  const handleStyleChange = (key: string, value: any) => {
    setStyle((prev: any) => ({
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
        style,
        inputCount,
        outputCount,
        inputs: hasInputs,
        outputs: hasOutputs,
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

  const renderAppearanceSettings = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="backgroundColor">Background Color</Label>
          <select
            id="backgroundColor"
            value={style.backgroundColor}
            onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="bg-card">Default</option>
            <option value="bg-primary/10">Primary (Light)</option>
            <option value="bg-secondary/10">Secondary (Light)</option>
            <option value="bg-accent/10">Accent (Light)</option>
            <option value="bg-destructive/10">Destructive (Light)</option>
            <option value="bg-muted">Muted</option>
            <option value="bg-background">Background</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="borderColor">Border Color</Label>
          <select
            id="borderColor"
            value={style.borderColor}
            onChange={(e) => handleStyleChange("borderColor", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="border-border">Default</option>
            <option value="border-primary">Primary</option>
            <option value="border-secondary">Secondary</option>
            <option value="border-accent">Accent</option>
            <option value="border-destructive">Destructive</option>
            <option value="border-muted">Muted</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="textColor">Text Color</Label>
          <select
            id="textColor"
            value={style.textColor}
            onChange={(e) => handleStyleChange("textColor", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="text-foreground">Default</option>
            <option value="text-primary">Primary</option>
            <option value="text-secondary">Secondary</option>
            <option value="text-accent">Accent</option>
            <option value="text-destructive">Destructive</option>
            <option value="text-muted-foreground">Muted</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accentColor">Accent Color</Label>
          <select
            id="accentColor"
            value={style.accentColor}
            onChange={(e) => handleStyleChange("accentColor", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="accent">Accent</option>
            <option value="destructive">Destructive</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="width">Width ({style.width}px)</Label>
          <Slider
            id="width"
            min={180}
            max={400}
            step={10}
            value={[style.width]}
            onValueChange={(value) => handleStyleChange("width", value[0])}
          />
        </div>
      </div>
    )
  }

  const renderConnectionSettings = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="hasInputs">Enable Input Connections</Label>
          <Switch id="hasInputs" checked={hasInputs} onCheckedChange={setHasInputs} />
        </div>

        {hasInputs && (
          <div className="space-y-2">
            <Label htmlFor="inputCount">Number of Input Handles ({inputCount})</Label>
            <Slider
              id="inputCount"
              min={1}
              max={5}
              step={1}
              value={[inputCount]}
              onValueChange={(value) => setInputCount(value[0])}
              disabled={!hasInputs}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="hasOutputs">Enable Output Connections</Label>
          <Switch id="hasOutputs" checked={hasOutputs} onCheckedChange={setHasOutputs} />
        </div>

        {hasOutputs && (
          <div className="space-y-2">
            <Label htmlFor="outputCount">Number of Output Handles ({outputCount})</Label>
            <Slider
              id="outputCount"
              min={1}
              max={5}
              step={1}
              value={[outputCount]}
              onValueChange={(value) => setOutputCount(value[0])}
              disabled={!hasOutputs}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-80 border-l bg-card p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Block Configuration</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="general" className="flex items-center">
            <Info className="h-4 w-4 mr-1" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center">
            <Palette className="h-4 w-4 mr-1" />
            <span>Style</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center">
            <Sliders className="h-4 w-4 mr-1" />
            <span>Connections</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
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

          <Accordion type="single" collapsible defaultValue="config">
            <AccordionItem value="config">
              <AccordionTrigger className="text-sm font-medium">Block-specific Configuration</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">{renderConfigFields()}</div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          {renderAppearanceSettings()}
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          {renderConnectionSettings()}
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button className="w-full" onClick={handleSave}>
          Apply Changes
        </Button>
      </div>
    </div>
  )
}
