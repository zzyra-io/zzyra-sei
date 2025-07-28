"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Search, Plus, X, Zap, AlertCircle } from "lucide-react"
import { MCPServerConfig, SelectedTool } from "@zyra/types"
import { AIAgentAPI } from "@/lib/api/ai-agent"

interface ToolsSelectorProps {
  selectedTools: SelectedTool[]
  onToolsChange: (tools: SelectedTool[]) => void
}

export function AIAgentToolsSelector({ selectedTools, onToolsChange }: ToolsSelectorProps) {
  const [categories, setCategories] = useState<Record<string, MCPServerConfig[]>>({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await AIAgentAPI.getMCPServersByCategory()
      setCategories(data)
      
      // Auto-expand first category
      const firstCategory = Object.keys(data)[0]
      if (firstCategory) {
        setExpandedCategories(new Set([firstCategory]))
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredCategories = Object.keys(categories).reduce((acc, category) => {
    const servers = categories[category].filter(server =>
      server.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    if (servers.length > 0) {
      acc[category] = servers
    }
    return acc
  }, {} as Record<string, MCPServerConfig[]>)

  const addTool = (server: MCPServerConfig, config: Record<string, any>) => {
    const newTool: SelectedTool = {
      id: server.id,
      name: server.displayName,
      type: 'mcp',
      config,
    }
    onToolsChange([...selectedTools, newTool])
    setConfiguring(null)
  }

  const removeTool = (index: number) => {
    const newTools = [...selectedTools]
    newTools.splice(index, 1)
    onToolsChange(newTools)
  }

  const testServer = async (serverId: string, config: Record<string, any>) => {
    try {
      const result = await AIAgentAPI.testMCPServer(serverId, config)
      setTestResults(prev => ({ ...prev, [serverId]: result }))
      return result
    } catch (error) {
      const failResult = {
        success: false,
        tools: [],
        error: error instanceof Error ? error.message : 'Test failed'
      }
      setTestResults(prev => ({ ...prev, [serverId]: failResult }))
      return failResult
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      database: '💾',
      web: '🌐',
      api: '🔌',
      automation: '🤖',
      development: '⚙️',
      ai: '🧠',
      time: '🕒',
      weather: '🌤️',
    }
    return icons[category] || '📦'
  }

  return (
    <div className="space-y-3">
      {/* Selected Tools */}
      {selectedTools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTools.map((tool, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {tool.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeTool(index)} />
            </Badge>
          ))}
        </div>
      )}

      {/* Tool Browser */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Available Tools</CardTitle>
            <Button size="sm" variant="outline" onClick={loadCategories}>
              Refresh
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading tools...</div>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {Object.entries(filteredCategories).map(([category, servers]) => (
                  <Collapsible
                    key={category}
                    open={expandedCategories.has(category)}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start h-8 px-2">
                        <div className="flex items-center gap-2">
                          {expandedCategories.has(category) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>{getCategoryIcon(category)}</span>
                          <span className="font-medium capitalize">{category}</span>
                          <Badge variant="outline" className="text-xs">{servers.length}</Badge>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 space-y-1">
                      {servers.map((server) => (
                        <Button
                          key={server.id}
                          variant="ghost"
                          className="w-full justify-start h-auto p-2 text-left"
                          onClick={() => setConfiguring(server.id)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span>{server.icon}</span>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{server.displayName}</div>
                              <div className="text-xs text-muted-foreground">{server.description}</div>
                            </div>
                            {selectedTools.some(t => t.id === server.id) && (
                              <Badge variant="default" className="text-xs">Added</Badge>
                            )}
                          </div>
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      {configuring && (
        <ConfigForm
          server={Object.values(categories).flat().find(s => s.id === configuring)!}
          onSave={(config) => {
            const server = Object.values(categories).flat().find(s => s.id === configuring)!
            addTool(server, config)
          }}
          onCancel={() => setConfiguring(null)}
          onTest={testServer}
          testResult={testResults[configuring]}
        />
      )}
    </div>
  )
}

function ConfigForm({
  server,
  onSave,
  onCancel,
  onTest,
  testResult,
}: {
  server: MCPServerConfig
  onSave: (config: Record<string, any>) => void
  onCancel: () => void
  onTest: (serverId: string, config: Record<string, any>) => Promise<any>
  testResult?: any
}) {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    await onTest(server.id, config)
    setTesting(false)
  }

  const canTest = () => {
    const required = server.configSchema.required || []
    return required.every(field => config[field])
  }

  const canSave = () => canTest() && testResult?.success

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{server.displayName} Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(server.configSchema.properties).map(([key, schema]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">
              {schema.description}
              {server.configSchema.required?.includes(key) && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Input
              type={schema.sensitive ? "password" : "text"}
              value={config[key] || ''}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              placeholder={schema.default || ''}
            />
          </div>
        ))}

        <div className="flex gap-2 items-center">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleTest}
            disabled={!canTest() || testing}
          >
            {testing ? 'Testing...' : 'Test'}
          </Button>
          {testResult && (
            <Badge variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? `✅ ${testResult.tools.length} tools` : '❌ Failed'}
            </Badge>
          )}
        </div>

        {testResult && !testResult.success && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{testResult.error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" onClick={() => onSave(config)} disabled={!canSave()}>
            <Zap className="h-3 w-3 mr-1" />
            Add Tool
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}