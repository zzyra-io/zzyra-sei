"use client";

import { cn } from "@/lib/utils";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronRight,
  Plus,
  Settings,
  Brain,
  Zap,
  Database,
  Globe,
  FileText,
  Search,
  Code,
  MessageSquare,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AIAgentAPI } from "@/lib/api/ai-agent";
import { MCPServerConfig } from "@zyra/types";

// Types
interface ToolNode {
  id: string;
  name: string;
  description: string;
  category: string;
  type: "mcp" | "goat" | "builtin";
  icon: React.ReactNode;
  color: string;
  isConnected: boolean;
  isEnabled: boolean;
  disabled?: boolean;
  config?: Record<string, unknown>;
  configSchema?: MCPServerConfig["configSchema"];
}

interface AIAgentData {
  config: {
    agent: {
      name: string;
      systemPrompt: string;
      userPrompt: string;
      thinkingMode: "fast" | "deliberate" | "collaborative";
      maxSteps: number;
    };
    provider: {
      type: string;
      model: string;
      temperature: number;
      maxTokens: number;
    };
    execution: {
      mode: "autonomous" | "interactive";
      timeout: number;
      saveThinking: boolean;
      requireApproval: boolean;
    };
    selectedTools: Array<{
      id: string;
      name: string;
      type: "mcp" | "goat" | "builtin";
      config?: Record<string, unknown>;
    }>;
  };
  onAddComponent?: (nodeId: string, type: string, component: unknown) => void;
  onUpdateConfig?: (config: unknown) => void;
  getAvailableComponents?: (type: string) => unknown[];
  status?: "idle" | "running" | "completed" | "error";
  executionProgress?: number;
  thinkingSteps?: unknown[];
  toolCalls?: unknown[];
}

interface AddComponentPopoverProps {
  items: ToolNode[];
  onSelect: (item: ToolNode) => void;
  onClose: () => void;
  isLoading?: boolean;
}

interface ToolConfigModalProps {
  tool: ToolNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tool: ToolNode, config: Record<string, unknown>) => void;
}

// Tool Icons Mapping
const toolIcons: Record<string, React.ReactNode> = {
  database: <Database className='w-4 h-4' />,
  web: <Globe className='w-4 h-4' />,
  filesystem: <FileText className='w-4 h-4' />,
  search: <Search className='w-4 h-4' />,
  code: <Code className='w-4 h-4' />,
  communication: <MessageSquare className='w-4 h-4' />,
  ai: <Brain className='w-4 h-4' />,
  automation: <Zap className='w-4 h-4' />,
};

const toolColors: Record<string, string> = {
  database: "bg-blue-500",
  web: "bg-green-500",
  filesystem: "bg-purple-500",
  search: "bg-orange-500",
  code: "bg-indigo-500",
  communication: "bg-pink-500",
  ai: "bg-cyan-500",
  automation: "bg-yellow-500",
};

// Helper function to convert MCP server config to ToolNode
const convertMCPServerToToolNode = (server: MCPServerConfig): ToolNode => {
  const category = server.category || "ai";
  return {
    id: server.id,
    name: server.displayName || server.name,
    description: server.description,
    category,
    type: "mcp",
    icon: toolIcons[category] || toolIcons.ai,
    color: toolColors[category] || toolColors.ai,
    isConnected: false,
    isEnabled: false,
    disabled: false,
    config: {},
    configSchema: server.configSchema,
  };
};

// Hook to fetch MCP servers
const useMCPServers = () => {
  const [availableTools, setAvailableTools] = useState<ToolNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMCPServers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const servers = await AIAgentAPI.getMCPServers();
        const toolNodes = servers.map(convertMCPServerToToolNode);

        setAvailableTools(toolNodes);
      } catch (err) {
        console.error("Failed to fetch MCP servers:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load MCP servers"
        );

        // Fallback to static tools if API fails
        const fallbackTools: ToolNode[] = [
          {
            id: "postgres",
            name: "PostgreSQL",
            description: "Database operations and queries",
            category: "database",
            type: "mcp",
            icon: toolIcons.database,
            color: toolColors.database,
            isConnected: false,
            isEnabled: false,
            disabled: false,
          },
          {
            id: "brave-search",
            name: "Web Search",
            description: "Search the web for information",
            category: "web",
            type: "mcp",
            icon: toolIcons.search,
            color: toolColors.search,
            isConnected: false,
            isEnabled: false,
            disabled: false,
          },
          {
            id: "filesystem",
            name: "File System",
            description: "Read and write files",
            category: "filesystem",
            type: "mcp",
            icon: toolIcons.filesystem,
            color: toolColors.filesystem,
            isConnected: false,
            isEnabled: false,
            disabled: false,
          },
          {
            id: "goat-blockchain",
            name: "GOAT Blockchain",
            description: "Blockchain operations and wallet management",
            category: "ai",
            type: "goat",
            icon: toolIcons.ai,
            color: toolColors.ai,
            isConnected: false,
            isEnabled: false,
            disabled: false,
          },
        ];
        setAvailableTools(fallbackTools);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMCPServers();
  }, []);

  return { availableTools, isLoading, error };
};

// --- POPOVER COMPONENT ---
const AddComponentPopover = memo(
  ({
    items,
    onSelect,
    onClose,
    isLoading = false,
  }: AddComponentPopoverProps) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          popoverRef.current &&
          !popoverRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
      <div
        ref={popoverRef}
        className='absolute top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 animate-in fade-in-0 slide-in-from-top-2 duration-200'>
        <div className='p-2'>
          {isLoading ? (
            <div className='flex items-center justify-center p-4'>
              <Loader2 className='w-4 h-4 animate-spin mr-2' />
              <span className='text-sm text-gray-500'>
                Loading MCP servers...
              </span>
            </div>
          ) : items.length === 0 ? (
            <div className='p-4 text-center text-sm text-gray-500'>
              No MCP servers available
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className='w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:hover:bg-transparent'
                disabled={item.disabled || false}>
                <div
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center text-white",
                    item.color
                  )}>
                  {item.icon}
                </div>
                <div>
                  <p className='font-semibold text-sm text-gray-800'>
                    {item.name}
                  </p>
                  <p className='text-xs text-gray-500'>{item.description}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }
);
AddComponentPopover.displayName = "AddComponentPopover";

// --- AGENT NODE COMPONENT ---
export function AgentNodeComponent({
  id,
  data,
}: {
  id: string;
  data: AIAgentData;
}) {
  const [popover, setPopover] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [connectedTools, setConnectedTools] = useState<ToolNode[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [configModal, setConfigModal] = useState<{
    isOpen: boolean;
    tool: ToolNode | null;
  }>({ isOpen: false, tool: null });
  const { availableTools, isLoading, error } = useMCPServers();

  const { updateNode } = useReactFlow();

  const handleAddClick = (type: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPopover(popover === type ? null : type);
  };

  const handleSelect = (item: ToolNode) => {
    // Check if tool needs configuration
    const hasConfigSchema =
      item.configSchema?.properties &&
      Object.keys(item.configSchema.properties).length > 0;

    if (hasConfigSchema) {
      // Open configuration modal
      setConfigModal({ isOpen: true, tool: item });
      setPopover(null);
    } else {
      // Add tool directly without configuration
      addToolToConfig(item, {});
    }
  };

  const addToolToConfig = (tool: ToolNode, config: Record<string, unknown>) => {
    const newTool = { ...tool, isConnected: true, isEnabled: true, config };
    setConnectedTools((prev) => [...prev, newTool]);

    // Update the selectedTools in the config with the proper format
    const currentSelectedTools =
      (data.config?.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
      }>) || [];
    const newSelectedTool = {
      id: tool.id,
      name: tool.name,
      type: tool.type,
      config: config || {},
    };

    handleConfigUpdate({
      selectedTools: [...currentSelectedTools, newSelectedTool],
    });
  };

  const handleConfigModalSave = (
    tool: ToolNode,
    config: Record<string, unknown>
  ) => {
    addToolToConfig(tool, config);
    setConfigModal({ isOpen: false, tool: null });
  };

  const handleConfigModalClose = () => {
    setConfigModal({ isOpen: false, tool: null });
  };

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    setConnectedTools((prev) =>
      prev.map((tool) =>
        tool.id === toolId ? { ...tool, isEnabled: enabled } : tool
      )
    );
  };

  const handleRemoveTool = (toolId: string) => {
    setConnectedTools((prev) => prev.filter((tool) => tool.id !== toolId));

    // Update the selectedTools in the config
    const currentSelectedTools =
      (data.config?.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
      }>) || [];
    const updatedSelectedTools = currentSelectedTools.filter(
      (tool) => tool.id !== toolId
    );

    handleConfigUpdate({
      selectedTools: updatedSelectedTools,
    });
  };

  const handleConfigUpdate = (updates: Record<string, unknown>) => {
    const currentConfig = (data.config as Record<string, unknown>) || {};

    // Deep merge function to properly handle nested objects
    const deepMerge = (
      target: Record<string, unknown>,
      source: Record<string, unknown>
    ): Record<string, unknown> => {
      const result = { ...target };

      for (const [key, value] of Object.entries(source)) {
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
        ) {
          // Recursively merge nested objects
          result[key] = deepMerge(
            result[key] as Record<string, unknown>,
            value as Record<string, unknown>
          );
        } else {
          // Direct assignment for primitives, arrays, or when target doesn't have the key
          result[key] = value;
        }
      }

      return result;
    };

    const newConfig = deepMerge(currentConfig, updates);

    // Update the node data directly using React Flow
    updateNode(id, (node) => ({
      ...node,
      data: {
        ...node.data,
        config: newConfig,
      },
    }));

    // Also call the callback if it exists (for backward compatibility)
    if (data.onUpdateConfig) {
      data.onUpdateConfig(newConfig);
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case "running":
        return <Play className='w-4 h-4 text-green-500' />;
      case "completed":
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      case "error":
        return <AlertCircle className='w-4 h-4 text-red-500' />;
      default:
        return <Clock className='w-4 h-4 text-gray-400' />;
    }
  };

  const getStatusText = () => {
    switch (data.status) {
      case "running":
        return "Running";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  };

  return (
    <div
      className={cn(
        "bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/80 flex transition-all duration-300 ease-in-out",
        isExpanded ? "w-[680px]" : "w-[380px]"
      )}>
      {/* Main Node Content */}
      <div className='w-[380px] flex-shrink-0'>
        <div className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg'>
                <Brain className='w-7 h-7 text-white' />
              </div>
              <div>
                <h3 className='font-bold text-lg text-gray-900'>
                  {data.config?.agent?.name || "AI Agent"}
                </h3>
                <p className='text-sm text-gray-500'>
                  {data.config?.agent?.systemPrompt ||
                    "AI-powered agent with tools and reasoning capabilities"}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1 text-xs text-gray-500'>
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className='flex items-center gap-1 px-2 py-2 bg-gray-100/80 hover:bg-gray-200/80 rounded-lg transition-colors'
                title={isExpanded ? "Collapse" : "Expand"}>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-gray-500 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
                <Plus className='w-5 h-5 text-gray-600' />
              </button>
            </div>
          </div>

          {/* Execution Progress */}
          {data.status === "running" &&
            data.executionProgress !== undefined && (
              <div className='mb-4'>
                <div className='flex items-center justify-between text-xs text-gray-600 mb-1'>
                  <span>Execution Progress</span>
                  <span>{Math.round(data.executionProgress)}%</span>
                </div>
                <Progress value={data.executionProgress} className='h-2' />
              </div>
            )}

          {/* Connected Tools */}
          <div className='mb-4'>
            <div className='flex items-center justify-between mb-2'>
              <h4 className='text-sm font-semibold text-gray-700'>
                Connected Tools
              </h4>
              <button
                onClick={(e) => handleAddClick("tool", e)}
                className='w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors'
                title='Add Tool'>
                <Plus className='w-3 h-3 text-white' />
              </button>
            </div>
            <div className='space-y-2'>
              {connectedTools.length === 0 ? (
                <div className='text-xs text-gray-500 italic'>
                  No tools connected
                </div>
              ) : (
                connectedTools.map((tool) => (
                  <div
                    key={tool.id}
                    className='flex items-center justify-between p-2 bg-gray-50 rounded-lg'>
                    <div className='flex items-center gap-2'>
                      <div
                        className={cn(
                          "w-6 h-6 rounded flex items-center justify-center",
                          tool.color
                        )}>
                        {tool.icon}
                      </div>
                      <span className='text-sm font-medium'>{tool.name}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Switch
                        checked={tool.isEnabled}
                        onCheckedChange={(enabled) =>
                          handleToolToggle(tool.id, enabled)
                        }
                      />
                      <button
                        onClick={() => handleRemoveTool(tool.id)}
                        className='w-4 h-4 text-gray-400 hover:text-red-500 transition-colors'
                        title='Remove Tool'>
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {popover === "tool" && (
              <AddComponentPopover
                items={availableTools}
                onSelect={handleSelect}
                onClose={() => setPopover(null)}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Thinking Steps Preview */}
          {data.thinkingSteps && data.thinkingSteps.length > 0 && (
            <div className='mb-4'>
              <h4 className='text-sm font-semibold text-gray-700 mb-2'>
                Thinking Process
              </h4>
              <div className='space-y-1 max-h-20 overflow-y-auto'>
                {data.thinkingSteps.slice(-3).map((step, index) => {
                  const stepData = step as Record<string, unknown>;
                  return (
                    <div
                      key={index}
                      className='text-xs text-gray-600 bg-gray-50 p-2 rounded'>
                      <span className='font-medium'>
                        {stepData.type as string}:
                      </span>{" "}
                      {(stepData.reasoning as string)?.substring(0, 50)}...
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <Handle
          type='target'
          position={Position.Left}
          className='!w-3 !h-3 !bg-blue-500 !border-2 !border-white'
        />
        <Handle
          type='source'
          position={Position.Right}
          className='!w-3 !h-3 !bg-blue-500 !border-2 !border-white'
        />
      </div>

      {/* Expanded Configuration Panel */}
      {isExpanded && (
        <div className='w-[300px] flex-shrink-0 border-l border-gray-200/80'>
          <Tabs defaultValue='config' className='h-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='config'>Config</TabsTrigger>
              <TabsTrigger value='tools'>Tools</TabsTrigger>
              <TabsTrigger value='execution'>Execution</TabsTrigger>
            </TabsList>

            <TabsContent value='config' className='p-4 space-y-4'>
              <div>
                <Label className='text-xs'>Agent Name</Label>
                <input
                  value={data.config?.agent?.name || ""}
                  onChange={(e) =>
                    handleConfigUpdate({
                      agent: { ...data.config?.agent, name: e.target.value },
                    })
                  }
                  className='w-full text-sm p-2 border border-gray-200 rounded mt-1'
                  placeholder='AI Assistant'
                />
              </div>

              <div>
                <Label className='text-xs'>System Prompt</Label>
                <Textarea
                  value={data.config?.agent?.systemPrompt || ""}
                  onChange={(e) =>
                    handleConfigUpdate({
                      agent: {
                        ...data.config?.agent,
                        systemPrompt: e.target.value,
                      },
                    })
                  }
                  className='w-full text-sm mt-1'
                  placeholder='You are a helpful AI assistant...'
                  rows={3}
                />
              </div>

              <div>
                <Label className='text-xs'>User Prompt</Label>
                <Textarea
                  value={data.config?.agent?.userPrompt || ""}
                  onChange={(e) =>
                    handleConfigUpdate({
                      agent: {
                        ...data.config?.agent,
                        userPrompt: e.target.value,
                      },
                    })
                  }
                  className='w-full text-sm mt-1'
                  placeholder='What would you like me to help you with?'
                  rows={2}
                />
              </div>

              <div>
                <Label className='text-xs'>Thinking Mode</Label>
                <Select
                  value={data.config?.agent?.thinkingMode || "deliberate"}
                  onValueChange={(value) =>
                    handleConfigUpdate({
                      agent: { ...data.config?.agent, thinkingMode: value },
                    })
                  }>
                  <SelectTrigger className='w-full text-sm mt-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='fast'>Fast</SelectItem>
                    <SelectItem value='deliberate'>Deliberate</SelectItem>
                    <SelectItem value='collaborative'>Collaborative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value='tools' className='p-4'>
              <div className='space-y-2'>
                <h4 className='text-sm font-semibold'>Available Tools</h4>
                {isLoading ? (
                  <div className='flex items-center justify-center p-4'>
                    <Loader2 className='w-6 h-6 animate-spin mr-2' />
                    <span className='text-sm text-gray-500'>
                      Loading tools...
                    </span>
                  </div>
                ) : error ? (
                  <div className='p-4 text-center text-sm text-red-500'>
                    Failed to load tools: {error}
                  </div>
                ) : (
                  availableTools.map((tool) => (
                    <div
                      key={tool.id}
                      className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                      <div className='flex items-center gap-2'>
                        <div
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center",
                            tool.color
                          )}>
                          {tool.icon}
                        </div>
                        <div>
                          <div className='text-sm font-medium'>{tool.name}</div>
                          <div className='text-xs text-gray-500'>
                            {tool.description}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={connectedTools.some(
                          (t) => t.id === tool.id && t.isEnabled
                        )}
                        onCheckedChange={(enabled) => {
                          if (enabled) {
                            handleSelect(tool);
                          } else {
                            handleRemoveTool(tool.id);
                          }
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value='execution' className='p-4 space-y-4'>
              <div>
                <Label className='text-xs'>Execution Mode</Label>
                <Select
                  value={data.config?.execution?.mode || "autonomous"}
                  onValueChange={(value) =>
                    handleConfigUpdate({
                      execution: { ...data.config?.execution, mode: value },
                    })
                  }>
                  <SelectTrigger className='w-full text-sm mt-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='autonomous'>Autonomous</SelectItem>
                    <SelectItem value='interactive'>Interactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs'>Save Thinking Process</Label>
                  <Switch
                    checked={data.config?.execution?.saveThinking || false}
                    onCheckedChange={(checked) =>
                      handleConfigUpdate({
                        execution: {
                          ...data.config?.execution,
                          saveThinking: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <Label className='text-xs'>Require Approval</Label>
                  <Switch
                    checked={data.config?.execution?.requireApproval || false}
                    onCheckedChange={(checked) =>
                      handleConfigUpdate({
                        execution: {
                          ...data.config?.execution,
                          requireApproval: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className='pt-4'>
                <Button
                  className='w-full'
                  size='sm'
                  onClick={() => setIsExecuting(!isExecuting)}
                  disabled={data.status === "running"}>
                  {data.status === "running" ? (
                    <>
                      <Pause className='w-4 h-4 mr-2' />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className='w-4 h-4 mr-2' />
                      Execute
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Tool Configuration Modal */}
      <ToolConfigModal
        tool={configModal.tool}
        isOpen={configModal.isOpen}
        onClose={handleConfigModalClose}
        onSave={handleConfigModalSave}
      />
    </div>
  );
}

const AgentNode = memo(AgentNodeComponent);
AgentNode.displayName = "AgentNode";

// --- TOOL NODE COMPONENT ---
export function ToolNodeComponent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className='flex flex-col items-center gap-2 group'>
      <div
        className={cn(
          "w-20 h-20 rounded-full bg-white shadow-lg border-2 flex items-center justify-center transition-all group-hover:scale-105",
          data.color?.toString().replace("bg-", "border-") || "border-gray-300"
        )}>
        <div className='w-16 h-16 rounded-full bg-white flex items-center justify-center'>
          {(data.icon as React.ReactNode) || (
            <Settings className='w-6 h-6 text-gray-400' />
          )}
        </div>
      </div>
      <p className='text-sm font-semibold text-gray-800'>
        {data.title?.toString() || "Tool"}
      </p>
      <Handle
        type='target'
        position={Position.Top}
        className='!w-3 !h-3 !bg-gray-400 !border-2 !border-white'
      />
      <Handle
        type='source'
        position={Position.Bottom}
        className='!w-3 !h-3 !bg-gray-400 !border-2 !border-white'
      />
    </div>
  );
}

const ToolNode = memo(ToolNodeComponent);
ToolNode.displayName = "ToolNode";

export { AgentNode, ToolNode };

// --- AI AGENT CONFIG COMPONENT ---
export function AIAgentConfig({
  config,
  onChange,
  executionStatus = "idle",
  onTest,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastResponse?: Record<string, unknown>;
  };
  onTest?: () => void;
}) {
  const [connectedTools, setConnectedTools] = useState<ToolNode[]>([]);
  const [popover, setPopover] = useState<string | null>(null);
  const { availableTools, isLoading, error } = useMCPServers();

  const handleAddClick = (type: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPopover(popover === type ? null : type);
  };

  const handleSelect = (item: ToolNode) => {
    const newTool = { ...item, isConnected: true, isEnabled: true };
    setConnectedTools((prev) => [...prev, newTool]);
    setPopover(null);

    // Update the selectedTools in the config with the proper format
    const currentSelectedTools =
      (config.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
      }>) || [];
    const newSelectedTool = {
      id: item.id,
      name: item.name,
      type: item.type,
      config: item.config || {},
    };

    handleConfigUpdate({
      selectedTools: [...currentSelectedTools, newSelectedTool],
    });
  };

  const handleRemoveTool = (toolId: string) => {
    setConnectedTools((prev) => prev.filter((tool) => tool.id !== toolId));

    // Update the selectedTools in the config
    const currentSelectedTools =
      (config.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
      }>) || [];
    const updatedSelectedTools = currentSelectedTools.filter(
      (tool) => tool.id !== toolId
    );

    handleConfigUpdate({
      selectedTools: updatedSelectedTools,
    });
  };

  const handleConfigUpdate = (updates: Record<string, unknown>) => {
    // Deep merge function to properly handle nested objects
    const deepMerge = (
      target: Record<string, unknown>,
      source: Record<string, unknown>
    ): Record<string, unknown> => {
      const result = { ...target };

      for (const [key, value] of Object.entries(source)) {
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
        ) {
          // Recursively merge nested objects
          result[key] = deepMerge(
            result[key] as Record<string, unknown>,
            value as Record<string, unknown>
          );
        } else {
          // Direct assignment for primitives, arrays, or when target doesn't have the key
          result[key] = value;
        }
      }

      return result;
    };

    const newConfig = deepMerge(config, updates);
    onChange(newConfig);
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case "running":
        return <Play className='w-4 h-4 text-green-500' />;
      case "success":
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      case "error":
        return <AlertCircle className='w-4 h-4 text-red-500' />;
      default:
        return <Clock className='w-4 h-4 text-gray-400' />;
    }
  };

  const getStatusText = () => {
    switch (executionStatus) {
      case "running":
        return "Running";
      case "success":
        return "Completed";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  };

  return (
    <div className='space-y-6'>
      {/* Status Header */}
      <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
            <Brain className='w-6 h-6 text-white' />
          </div>
          <div>
            <h3 className='font-semibold text-gray-900'>AI Agent</h3>
            <p className='text-sm text-gray-500'>AI-powered agent with tools</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1 text-xs text-gray-500'>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>
          {onTest && (
            <Button
              onClick={onTest}
              disabled={executionStatus === "running"}
              size='sm'>
              {executionStatus === "running" ? (
                <Pause className='w-4 h-4' />
              ) : (
                <Play className='w-4 h-4' />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue='agent' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='agent'>Agent</TabsTrigger>
          <TabsTrigger value='tools'>Tools</TabsTrigger>
          <TabsTrigger value='execution'>Execution</TabsTrigger>
        </TabsList>

        <TabsContent value='agent' className='space-y-4'>
          <div>
            <Label htmlFor='agent-name' className='text-sm font-medium'>
              Agent Name
            </Label>
            <input
              id='agent-name'
              value={
                ((config.agent as Record<string, unknown>)?.name as string) ||
                ""
              }
              onChange={(e) =>
                handleConfigUpdate({
                  agent: {
                    ...((config.agent as Record<string, unknown>) || {}),
                    name: e.target.value,
                  },
                })
              }
              className='w-full text-sm p-2 border border-gray-200 rounded mt-1'
              placeholder='AI Assistant'
            />
          </div>

          <div>
            <Label htmlFor='system-prompt' className='text-sm font-medium'>
              System Prompt
            </Label>
            <Textarea
              id='system-prompt'
              value={
                ((config.agent as Record<string, unknown>)
                  ?.systemPrompt as string) || ""
              }
              onChange={(e) =>
                handleConfigUpdate({
                  agent: {
                    ...((config.agent as Record<string, unknown>) || {}),
                    systemPrompt: e.target.value,
                  },
                })
              }
              className='w-full text-sm mt-1'
              placeholder='You are a helpful AI assistant...'
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor='user-prompt' className='text-sm font-medium'>
              User Prompt
            </Label>
            <Textarea
              id='user-prompt'
              value={
                ((config.agent as Record<string, unknown>)
                  ?.userPrompt as string) || ""
              }
              onChange={(e) =>
                handleConfigUpdate({
                  agent: {
                    ...((config.agent as Record<string, unknown>) || {}),
                    userPrompt: e.target.value,
                  },
                })
              }
              className='w-full text-sm mt-1'
              placeholder='What would you like me to help you with?'
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor='thinking-mode' className='text-sm font-medium'>
              Thinking Mode
            </Label>
            <Select
              value={
                ((config.agent as Record<string, unknown>)
                  ?.thinkingMode as string) || "deliberate"
              }
              onValueChange={(value) =>
                handleConfigUpdate({
                  agent: {
                    ...((config.agent as Record<string, unknown>) || {}),
                    thinkingMode: value,
                  },
                })
              }>
              <SelectTrigger id='thinking-mode' className='w-full text-sm mt-1'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='fast'>Fast</SelectItem>
                <SelectItem value='deliberate'>Deliberate</SelectItem>
                <SelectItem value='collaborative'>Collaborative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor='max-steps' className='text-sm font-medium'>
              Max Steps
            </Label>
            <input
              id='max-steps'
              type='number'
              title='Maximum number of thinking steps'
              value={
                ((config.agent as Record<string, unknown>)
                  ?.maxSteps as number) || 10
              }
              onChange={(e) =>
                handleConfigUpdate({
                  agent: {
                    ...((config.agent as Record<string, unknown>) || {}),
                    maxSteps: parseInt(e.target.value),
                  },
                })
              }
              className='w-full text-sm p-2 border border-gray-200 rounded mt-1'
              min={1}
              max={50}
            />
          </div>
        </TabsContent>

        <TabsContent value='tools' className='space-y-4'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h4 className='text-sm font-semibold'>Available Tools</h4>
              <button
                onClick={(e) => handleAddClick("tool", e)}
                className='w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors'
                title='Add Tool'>
                <Plus className='w-3 h-3 text-white' />
              </button>
            </div>
            {isLoading ? (
              <div className='flex items-center justify-center p-4'>
                <Loader2 className='w-6 h-6 animate-spin mr-2' />
                <span className='text-sm text-gray-500'>Loading tools...</span>
              </div>
            ) : error ? (
              <div className='p-4 text-center text-sm text-red-500'>
                Failed to load tools: {error}
              </div>
            ) : (
              availableTools.map((tool) => (
                <div
                  key={tool.id}
                  className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center",
                        tool.color
                      )}>
                      {tool.icon}
                    </div>
                    <div>
                      <div className='text-sm font-medium'>{tool.name}</div>
                      <div className='text-xs text-gray-500'>
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={connectedTools.some(
                      (t) => t.id === tool.id && t.isEnabled
                    )}
                    onCheckedChange={(enabled) => {
                      if (enabled) {
                        handleSelect(tool);
                      } else {
                        handleRemoveTool(tool.id);
                      }
                    }}
                  />
                </div>
              ))
            )}
            {popover === "tool" && (
              <AddComponentPopover
                items={availableTools} // Pass availableTools to the popover
                onSelect={handleSelect}
                onClose={() => setPopover(null)}
                isLoading={isLoading}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value='execution' className='space-y-4'>
          <div>
            <Label htmlFor='execution-mode' className='text-sm font-medium'>
              Execution Mode
            </Label>
            <Select
              value={
                ((config.execution as Record<string, unknown>)
                  ?.mode as string) || "autonomous"
              }
              onValueChange={(value) =>
                handleConfigUpdate({
                  execution: {
                    ...((config.execution as Record<string, unknown>) || {}),
                    mode: value,
                  },
                })
              }>
              <SelectTrigger
                id='execution-mode'
                className='w-full text-sm mt-1'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='autonomous'>Autonomous</SelectItem>
                <SelectItem value='interactive'>Interactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='save-thinking' className='text-sm font-medium'>
                Save Thinking Process
              </Label>
              <Switch
                id='save-thinking'
                checked={
                  ((config.execution as Record<string, unknown>)
                    ?.saveThinking as boolean) || false
                }
                onCheckedChange={(checked) =>
                  handleConfigUpdate({
                    execution: {
                      ...((config.execution as Record<string, unknown>) || {}),
                      saveThinking: checked,
                    },
                  })
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <Label htmlFor='require-approval' className='text-sm font-medium'>
                Require Approval
              </Label>
              <Switch
                id='require-approval'
                checked={
                  ((config.execution as Record<string, unknown>)
                    ?.requireApproval as boolean) || false
                }
                onCheckedChange={(checked) =>
                  handleConfigUpdate({
                    execution: {
                      ...((config.execution as Record<string, unknown>) || {}),
                      requireApproval: checked,
                    },
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor='timeout' className='text-sm font-medium'>
              Timeout (ms)
            </Label>
            <input
              id='timeout'
              type='number'
              title='Execution timeout in milliseconds'
              value={
                ((config.execution as Record<string, unknown>)
                  ?.timeout as number) || 120000
              }
              onChange={(e) =>
                handleConfigUpdate({
                  execution: {
                    ...((config.execution as Record<string, unknown>) || {}),
                    timeout: parseInt(e.target.value),
                  },
                })
              }
              className='w-full text-sm p-2 border border-gray-200 rounded mt-1'
              min={1000}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- TOOL CONFIGURATION MODAL ---
const ToolConfigModal = ({
  tool,
  isOpen,
  onClose,
  onSave,
}: ToolConfigModalProps) => {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    if (tool) {
      // Initialize config with default values from schema
      const initialConfig: Record<string, unknown> = {};
      if (tool.configSchema?.properties) {
        Object.entries(tool.configSchema.properties).forEach(([key, prop]) => {
          if (prop.default !== undefined) {
            initialConfig[key] = prop.default;
          }
        });
      }
      setConfig(initialConfig);
    }
  }, [tool]);

  const handleSave = () => {
    if (tool) {
      onSave(tool, config);
      onClose();
    }
  };

  const renderConfigField = (key: string, prop: Record<string, unknown>) => {
    const value = config[key];
    const showPassword = showPasswords[key] || false;

    return (
      <div key={key} className='space-y-2'>
        <Label htmlFor={key} className='text-sm font-medium'>
          {key}
          {prop.required && <span className='text-red-500 ml-1'>*</span>}
        </Label>
        <div className='relative'>
          {prop.type === "string" && prop.sensitive ? (
            <div className='relative'>
              <Input
                id={key}
                type={showPassword ? "text" : "password"}
                value={(value as string) || ""}
                onChange={(e) =>
                  setConfig({ ...config, [key]: e.target.value })
                }
                placeholder={String(prop.description || "")}
                className='pr-10'
              />
              <button
                type='button'
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    [key]: !showPassword,
                  })
                }
                className='absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'>
                {showPassword ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>
          ) : prop.type === "string" ? (
            <Input
              id={key}
              value={(value as string) || ""}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              placeholder={String(prop.description || "")}
            />
          ) : prop.type === "number" ? (
            <Input
              id={key}
              type='number'
              value={(value as number) || ""}
              onChange={(e) =>
                setConfig({ ...config, [key]: Number(e.target.value) })
              }
              placeholder={String(prop.description || "")}
            />
          ) : prop.type === "boolean" ? (
            <Switch
              id={key}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) =>
                setConfig({ ...config, [key]: checked })
              }
            />
          ) : (
            <Textarea
              id={key}
              value={(value as string) || ""}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              placeholder={String(prop.description || "")}
              rows={3}
            />
          )}
        </div>
        {prop.description && (
          <p className='text-xs text-gray-500'>{String(prop.description)}</p>
        )}
      </div>
    );
  };

  if (!tool) return null;

  const hasConfigSchema =
    tool.configSchema?.properties &&
    Object.keys(tool.configSchema.properties).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Configure {tool.name}</DialogTitle>
          <DialogDescription>{String(tool.description)}</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {hasConfigSchema ? (
            Object.entries(tool.configSchema!.properties).map(([key, prop]) =>
              renderConfigField(key, prop)
            )
          ) : (
            <p className='text-sm text-gray-500'>
              This tool doesn&apos;t require any configuration.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
