"use client";

import { cn } from "@/lib/utils";
import { Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bot,
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
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Types
interface ToolNode {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  isConnected: boolean;
  isEnabled: boolean;
  config?: Record<string, any>;
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
      mode: "autonomous" | "manual";
      timeout: number;
      saveThinking: boolean;
      requireApproval: boolean;
    };
    selectedTools: string[];
  };
  onAddComponent?: (nodeId: string, type: string, component: any) => void;
  onUpdateConfig?: (config: any) => void;
  getAvailableComponents?: (type: string) => any[];
  status?: "idle" | "running" | "completed" | "error";
  executionProgress?: number;
  thinkingSteps?: any[];
  toolCalls?: any[];
}

interface AddComponentPopoverProps {
  items: any[];
  onSelect: (item: any) => void;
  onClose: () => void;
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

// Mock available tools - in real implementation, this would come from MCP server discovery
const mockAvailableTools: ToolNode[] = [
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Database operations and queries",
    category: "database",
    icon: toolIcons.database,
    color: toolColors.database,
    isConnected: false,
    isEnabled: false,
  },
  {
    id: "brave-search",
    name: "Web Search",
    description: "Search the web for information",
    category: "web",
    icon: toolIcons.search,
    color: toolColors.search,
    isConnected: false,
    isEnabled: false,
  },
  {
    id: "filesystem",
    name: "File System",
    description: "Read and write files",
    category: "filesystem",
    icon: toolIcons.filesystem,
    color: toolColors.filesystem,
    isConnected: false,
    isEnabled: false,
  },
  {
    id: "goat-blockchain",
    name: "GOAT Blockchain",
    description: "Blockchain operations and wallet management",
    category: "ai",
    icon: toolIcons.ai,
    color: toolColors.ai,
    isConnected: false,
    isEnabled: false,
  },
];

// --- POPOVER COMPONENT ---
const AddComponentPopover = memo(
  ({ items, onSelect, onClose }: AddComponentPopoverProps) => {
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
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className='w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:hover:bg-transparent'
              disabled={item.disabled}>
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
          ))}
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

  const handleAddClick = (type: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPopover(popover === type ? null : type);
  };

  const handleSelect = (item: ToolNode) => {
    const newTool = { ...item, isConnected: true, isEnabled: true };
    setConnectedTools((prev) => [...prev, newTool]);
    setPopover(null);
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
                        size='sm'
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
                items={mockAvailableTools}
                onSelect={handleSelect}
                onClose={() => setPopover(null)}
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
                {data.thinkingSteps.slice(-3).map((step, index) => (
                  <div
                    key={index}
                    className='text-xs text-gray-600 bg-gray-50 p-2 rounded'>
                    <span className='font-medium'>{step.type}:</span>{" "}
                    {step.reasoning.substring(0, 50)}...
                  </div>
                ))}
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
                    data.onUpdateConfig?.({
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
                    data.onUpdateConfig?.({
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
                    data.onUpdateConfig?.({
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
                    data.onUpdateConfig?.({
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
                {mockAvailableTools.map((tool) => (
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
                      size='sm'
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value='execution' className='p-4 space-y-4'>
              <div>
                <Label className='text-xs'>Execution Mode</Label>
                <Select
                  value={data.config?.execution?.mode || "autonomous"}
                  onValueChange={(value) =>
                    data.onUpdateConfig?.({
                      execution: { ...data.config?.execution, mode: value },
                    })
                  }>
                  <SelectTrigger className='w-full text-sm mt-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='autonomous'>Autonomous</SelectItem>
                    <SelectItem value='manual'>Manual Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs'>Save Thinking Process</Label>
                  <Switch
                    checked={data.config?.execution?.saveThinking || false}
                    onCheckedChange={(checked) =>
                      data.onUpdateConfig?.({
                        execution: {
                          ...data.config?.execution,
                          saveThinking: checked,
                        },
                      })
                    }
                    size='sm'
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <Label className='text-xs'>Require Approval</Label>
                  <Switch
                    checked={data.config?.execution?.requireApproval || false}
                    onCheckedChange={(checked) =>
                      data.onUpdateConfig?.({
                        execution: {
                          ...data.config?.execution,
                          requireApproval: checked,
                        },
                      })
                    }
                    size='sm'
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
    </div>
  );
}

const AgentNode = memo(AgentNodeComponent);
AgentNode.displayName = "AgentNode";

// --- TOOL NODE COMPONENT ---
export function ToolNodeComponent({ data }: { data: any }) {
  return (
    <div className='flex flex-col items-center gap-2 group'>
      <div
        className={cn(
          "w-20 h-20 rounded-full bg-white shadow-lg border-2 flex items-center justify-center transition-all group-hover:scale-105",
          data.color?.replace("bg-", "border-") || "border-gray-300"
        )}>
        <div className='w-16 h-16 rounded-full bg-white flex items-center justify-center'>
          {data.icon || <Settings className='w-6 h-6 text-gray-400' />}
        </div>
      </div>
      <p className='text-sm font-semibold text-gray-800'>
        {data.title || "Tool"}
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
