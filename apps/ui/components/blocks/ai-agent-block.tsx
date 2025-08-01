"use client";
import { cn } from "@/lib/utils";
import type React from "react";

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
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { AIAgentAPI } from "@/lib/api/ai-agent";
import type { MCPServerConfig } from "@zyra/types";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import {
  useExecutionWebSocket,
  type NodeExecutionUpdate,
  type ExecutionLog,
} from "@/hooks/use-execution-websocket";
import LiveThinkingPanel from "./live-thinking-panel";

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
      description?: string;
      category?: string;
      enabled?: boolean;
    }>;
  };
  onAddComponent?: (nodeId: string, type: string, component: unknown) => void;
  onUpdateConfig?: (config: unknown) => void;
  getAvailableComponents?: (type: string) => unknown[];
  status?: "idle" | "running" | "completed" | "error";
  executionProgress?: number;
  thinkingSteps?: unknown[];
  toolCalls?: unknown[];
  executionId?: string;
  executionStartTime?: Date;
  executionEndTime?: Date;
  executionDuration?: number;
  executionOutput?: unknown;
  executionError?: string;
  logs?: Array<{
    level: "info" | "warn" | "error" | "debug";
    message: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
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
    config: {
      connection: server.connection,
      configSchema: server.configSchema,
    },
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
        const fallbackTools: ToolNode[] = [];
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

  // Collapsible section states
  const [sectionsOpen, setSectionsOpen] = useState({
    connectedTools: true,
    executionDetails: true,
    liveThinking: true,
  });

  const { availableTools, isLoading, error } = useMCPServers();
  const { updateNode: reactFlowUpdateNode } = useReactFlow();
  const { updateNode } = useWorkflowStore();

  // Real-time execution monitoring
  const { isConnected: wsConnected } = useExecutionWebSocket({
    executionId: data.executionId,
    onNodeUpdate: useCallback(
      (update: NodeExecutionUpdate) => {
        if (update.nodeId === id) {
          console.log(`AI Agent real-time update:`, update);
          console.log(`AI Agent output:`, update.output);
          console.log(`AI Agent thinkingSteps:`, update.output?.thinkingSteps);
          console.log(`AI Agent steps:`, update.output?.steps);

          // Update node with real-time execution data
          updateNode(id, {
            data: {
              status: update.status,
              executionProgress: update.progress,
              executionStartTime: update.startTime,
              executionEndTime: update.endTime,
              executionDuration: update.duration,
              executionOutput: update.output,
              executionError: update.error,
              // Add real-time thinking steps and tool calls if available
              thinkingSteps:
                update.output?.thinkingSteps || update.output?.steps,
              toolCalls: update.output?.toolCalls,
              logs: [
                {
                  level:
                    update.status === "failed" ? "error" : ("info" as const),
                  message: `Node ${update.status}${
                    update.error ? `: ${update.error}` : ""
                  }`,
                  timestamp: new Date().toISOString(),
                  metadata: { update },
                },
              ],
            },
          });
        }
      },
      [id, updateNode]
    ),
    onExecutionLog: useCallback(
      (log: ExecutionLog) => {
        if (log.nodeId === id) {
          console.log(`AI Agent execution log:`, log);
          // Add log to node data
          updateNode(id, {
            data: {
              logs: [
                {
                  level: log.level,
                  message: log.message,
                  timestamp: log.timestamp.toISOString(),
                  metadata: log.metadata,
                },
              ],
            },
          });
        }
      },
      [id, updateNode]
    ),
  });

  // Initialize connectedTools from config data and clean up duplicates
  useEffect(() => {
    console.log(
      "useEffect triggered with selectedTools:",
      data.config?.selectedTools
    );
    const selectedTools = data.config?.selectedTools || [];
    if (selectedTools.length > 0) {
      // Remove duplicates from selectedTools
      const uniqueTools = selectedTools.filter(
        (tool, index, self) => index === self.findIndex((t) => t.id === tool.id)
      );
      console.log(
        "Original tools:",
        selectedTools.length,
        "Unique tools:",
        uniqueTools.length
      );

      // If duplicates were found, update the config
      if (uniqueTools.length !== selectedTools.length) {
        console.log(
          `Removed ${
            selectedTools.length - uniqueTools.length
          } duplicate tools from config`
        );
        // Only update if we're not already in the middle of an update
        setTimeout(() => {
          handleConfigUpdate({
            selectedTools: uniqueTools,
          });
        }, 0);
      }

      // Convert selectedTools to ToolNode format
      const toolsFromConfig = uniqueTools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description || "",
        category: tool.category || "ai",
        type: tool.type,
        icon: toolIcons[tool.category || "ai"] || toolIcons.ai,
        color: toolColors[tool.category || "ai"] || toolColors.ai,
        isConnected: true,
        isEnabled: tool.enabled !== false, // Default to true unless explicitly false
        config: tool.config || {},
      }));

      console.log("Setting connectedTools:", toolsFromConfig);
      setConnectedTools(toolsFromConfig);
    } else {
      console.log("No selectedTools found, clearing connectedTools");
      setConnectedTools([]);
    }
  }, [data.config?.selectedTools]);

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
    // Check if tool already exists to prevent duplicates
    const existingTool = connectedTools.find((t) => t.id === tool.id);
    if (existingTool) {
      console.log(`Tool ${tool.name} already exists, skipping duplicate`);
      return;
    }

    const newTool = { ...tool, isConnected: true, isEnabled: true, config };
    setConnectedTools((prev) => [...prev, newTool]);

    // Update the selectedTools in the config with the proper format
    const currentSelectedTools =
      (data.config?.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
        description?: string;
        category?: string;
        enabled?: boolean;
      }>) || [];

    // Check if tool already exists in config to prevent duplicates
    const toolExistsInConfig = currentSelectedTools.some(
      (t) => t.id === tool.id
    );

    if (toolExistsInConfig) {
      console.log(
        `Tool ${tool.name} already exists in config, skipping duplicate`
      );
      return;
    }

    const newSelectedTool = {
      id: tool.id,
      name: tool.name,
      type: tool.type,
      config: config || {},
      description: tool.description,
      category: tool.category,
      enabled: true,
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
    console.log(
      "handleToolToggle called with toolId:",
      toolId,
      "enabled:",
      enabled
    );
    console.log("Current connectedTools before toggle:", connectedTools);

    setConnectedTools((prev) => {
      const updated = prev.map((tool) =>
        tool.id === toolId ? { ...tool, isEnabled: enabled } : tool
      );
      console.log("ConnectedTools after toggle:", updated);
      return updated;
    });

    // Update the selectedTools in the config to reflect the enabled state
    const currentSelectedTools =
      (data.config?.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
        enabled?: boolean;
      }>) || [];

    console.log(
      "Current selectedTools in config before toggle:",
      currentSelectedTools
    );

    const updatedSelectedTools = currentSelectedTools.map((tool) =>
      tool.id === toolId ? { ...tool, enabled } : tool
    );

    console.log("Updated selectedTools after toggle:", updatedSelectedTools);

    handleConfigUpdate({
      selectedTools: updatedSelectedTools,
    });
  };

  const handleRemoveTool = (toolId: string) => {
    console.log("handleRemoveTool called with toolId:", toolId);
    console.log("Current connectedTools before removal:", connectedTools);

    setConnectedTools((prev) => {
      const filtered = prev.filter((tool) => tool.id !== toolId);
      console.log("ConnectedTools after filtering:", filtered);
      return filtered;
    });

    // Update the selectedTools in the config
    const currentSelectedTools =
      (data.config?.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
        description?: string;
        category?: string;
        enabled?: boolean;
      }>) || [];

    console.log("Current selectedTools in config:", currentSelectedTools);

    const updatedSelectedTools = currentSelectedTools.filter(
      (tool) => tool.id !== toolId
    );

    console.log("Updated selectedTools after filtering:", updatedSelectedTools);

    handleConfigUpdate({
      selectedTools: updatedSelectedTools,
    });
  };

  const handleConfigUpdate = (updates: Record<string, unknown>) => {
    const currentConfig = (data.config as Record<string, unknown>) || {};

    // Special handling for selectedTools - always replace, never merge
    let newConfig: Record<string, unknown>;
    if (updates.selectedTools !== undefined) {
      // For selectedTools, always replace the entire array
      newConfig = {
        ...currentConfig,
        selectedTools: updates.selectedTools,
      };
    } else {
      // Deep merge function to properly handle nested objects for other properties
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

      newConfig = deepMerge(currentConfig, updates);
    }

    // Update the node data directly using Zustand store
    updateNode(id, {
      data: {
        ...data,
        config: newConfig,
      },
    });

    // Also call the callback if it exists (for backward compatibility)
    if (data.onUpdateConfig) {
      data.onUpdateConfig(newConfig);
    }
  };

  // Get status-specific animations and styles
  const getStatusAnimations = () => {
    switch (data.status) {
      case "running":
        return {
          containerClass: "thinking-glow",
          containerStyle: {
            animation: "thinking-glow 4s ease-in-out infinite",
            willChange: "box-shadow",
          },
          backgroundGlow: null,
          iconEffects: (
            <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/10 to-purple-400/10'></div>
          ),
        };
      case "completed":
        return {
          containerClass: "success-glow",
          containerStyle: {
            animation: "success-glow 3s ease-in-out",
            willChange: "box-shadow",
          },
          backgroundGlow: null,
          iconEffects: (
            <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-green-400/15 to-emerald-400/15'></div>
          ),
        };
      case "error":
        return {
          containerClass: "error-glow",
          containerStyle: {
            animation: "error-glow 2s ease-in-out infinite",
            willChange: "box-shadow",
          },
          backgroundGlow: null,
          iconEffects: (
            <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-red-400/15 to-orange-400/15'></div>
          ),
        };
      default: // idle
        return {
          containerClass: "idle-glow",
          containerStyle: {
            animation: "idle-glow 6s ease-in-out infinite",
            willChange: "auto",
          },
          backgroundGlow: null,
          iconEffects: (
            <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-gray-200/10 to-slate-200/10'></div>
          ),
        };
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

  // Get status-specific animations and styles
  const statusAnimations = getStatusAnimations();

  return (
    <>
      {/* Custom CSS animations */}
      <style jsx global>{`
        .thinking-glow {
          box-shadow:
            0 0 20px rgba(59, 130, 246, 0.4),
            0 0 40px rgba(147, 51, 234, 0.3),
            0 0 60px rgba(59, 130, 246, 0.2) !important;
          animation: thinking-glow 4s ease-in-out infinite !important;
        }

        .success-glow {
          box-shadow:
            0 0 20px rgba(34, 197, 94, 0.5),
            0 0 40px rgba(34, 197, 94, 0.3) !important;
          animation: success-glow 3s ease-in-out !important;
        }

        .error-glow {
          box-shadow:
            0 0 20px rgba(239, 68, 68, 0.5),
            0 0 40px rgba(239, 68, 68, 0.3) !important;
          animation: error-glow 2s ease-in-out infinite !important;
        }

        .idle-glow {
          box-shadow: 0 0 15px rgba(156, 163, 175, 0.3) !important;
          animation: idle-glow 6s ease-in-out infinite !important;
        }

        @keyframes thinking-glow {
          0%,
          100% {
            box-shadow:
              0 0 20px rgba(59, 130, 246, 0.4),
              0 0 40px rgba(147, 51, 234, 0.3),
              0 0 60px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow:
              0 0 35px rgba(59, 130, 246, 0.6),
              0 0 70px rgba(147, 51, 234, 0.4),
              0 0 100px rgba(59, 130, 246, 0.3);
          }
        }

        @keyframes success-glow {
          0% {
            box-shadow:
              0 0 15px rgba(34, 197, 94, 0.3),
              0 0 30px rgba(34, 197, 94, 0.2);
          }
          50% {
            box-shadow:
              0 0 25px rgba(34, 197, 94, 0.6),
              0 0 50px rgba(34, 197, 94, 0.4);
          }
          100% {
            box-shadow:
              0 0 20px rgba(34, 197, 94, 0.4),
              0 0 40px rgba(34, 197, 94, 0.3);
          }
        }

        @keyframes error-glow {
          0%,
          100% {
            box-shadow:
              0 0 20px rgba(239, 68, 68, 0.5),
              0 0 40px rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow:
              0 0 30px rgba(239, 68, 68, 0.7),
              0 0 60px rgba(239, 68, 68, 0.4);
          }
        }

        @keyframes idle-glow {
          0%,
          100% {
            box-shadow: 0 0 10px rgba(156, 163, 175, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(156, 163, 175, 0.4);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .thinking-glow,
          .success-glow,
          .error-glow,
          .idle-glow {
            animation: none !important;
          }

          .thinking-glow {
            box-shadow: 0 0 25px rgba(59, 130, 246, 0.5) !important;
          }

          .success-glow {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.5) !important;
          }

          .error-glow {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.5) !important;
          }

          .idle-glow {
            box-shadow: 0 0 15px rgba(156, 163, 175, 0.3) !important;
          }
        }
      `}</style>

      <div
        className={cn(
          "bg-card/95 backdrop-blur-md rounded-2xl shadow-lg border border-border flex transition-all duration-300 ease-in-out relative",
          isExpanded ? "w-[680px]" : "w-[380px]"
        )}
        style={{
          ...statusAnimations.containerStyle,
          position: "relative",
          zIndex: 1,
        }}>
        {/* Main content background */}
        <div className='absolute inset-0.5 rounded-2xl bg-card'></div>

        {/* Main Node Content */}
        <div
          className={cn(
            "w-[380px] flex-shrink-0 relative z-10",
            isExpanded && "border-r border-gray-200/80"
          )}>
          <div className='p-5'>
            {/* Status Bar - Most Prominent */}
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-4'>
                {/* Status-first approach */}
                <div className='flex flex-col items-center'>
                  <div
                    className={cn(
                      "w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg relative"
                    )}>
                    {/* Status-specific icon effects */}
                    {statusAnimations.iconEffects}

                    {/* Brain icon */}
                    <Brain className='w-7 h-7 text-white relative z-10' />
                  </div>
                  <div className='flex items-center gap-1 text-xs text-muted-foreground mt-1'>
                    {getStatusIcon()}
                    <span className='font-medium'>{getStatusText()}</span>
                  </div>
                </div>

                {/* Agent Identity */}
                <div className='flex-1'>
                  <h3 className='font-bold text-lg text-foreground'>
                    {data.config?.agent?.name || "AI Agent"}
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    {data.config?.agent?.systemPrompt ||
                      "AI-powered agent with tools and reasoning capabilities"}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                {/* Debug indicator */}

                {wsConnected && (
                  <div className='flex items-center gap-1 text-xs'>
                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse'></div>
                    <span className='text-green-600 font-medium'>Live</span>
                  </div>
                )}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    console.log(
                      "Configure button clicked, current isExpanded:",
                      isExpanded
                    );
                    setIsExpanded(!isExpanded);
                  }}
                  className='flex items-center gap-2'
                  aria-label={
                    isExpanded
                      ? "Collapse configuration"
                      : "Expand configuration"
                  }>
                  {isExpanded ? (
                    <>
                      <ChevronRight className='w-4 h-4 rotate-180' />
                      <span className='text-xs'>Collapse</span>
                    </>
                  ) : (
                    <>
                      <Settings className='w-4 h-4' />
                      <span className='text-xs'>Configure</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Live region for screen readers */}
            <div aria-live='polite' aria-atomic='true' className='sr-only'>
              Agent status: {getStatusText()}
              {data.executionProgress &&
                `, Progress: ${Math.round(data.executionProgress)}%`}
            </div>

            {/* Execution Progress */}
            {data.status === "running" &&
              data.executionProgress !== undefined && (
                <div className='mb-4'>
                  <div className='flex items-center justify-between text-xs text-gray-600 mb-1'>
                    <span className='font-medium'>Execution Progress</span>
                    <span className='font-bold'>
                      {Math.round(data.executionProgress)}%
                    </span>
                  </div>
                  <Progress value={data.executionProgress} className='h-2' />
                </div>
              )}

            {/* Active Tools Summary */}
            <Collapsible
              open={sectionsOpen.connectedTools}
              onOpenChange={(open) =>
                setSectionsOpen((prev) => ({ ...prev, connectedTools: open }))
              }
              className='mb-4'>
              <div className='flex items-center justify-between mb-2'>
                <CollapsibleTrigger className='flex items-center gap-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors'>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform",
                      sectionsOpen.connectedTools && "rotate-90"
                    )}
                  />
                  <Zap className='w-4 h-4' />
                  Connected Tools ({connectedTools.length})
                </CollapsibleTrigger>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={(e) => handleAddClick("tool", e)}
                  className='flex items-center gap-1'>
                  <Plus className='w-3 h-3' />
                  Add Tool
                </Button>
              </div>
              <CollapsibleContent>
                <div className='space-y-3'>
                  {connectedTools.length === 0 ? (
                    <div className='text-center py-6'>
                      <div className='text-gray-400 mb-2'>
                        <Zap className='w-8 h-8 mx-auto' />
                      </div>
                      <div className='text-sm text-gray-500 font-medium'>
                        No tools connected
                      </div>
                      <div className='text-xs text-gray-400 mt-1'>
                        Add tools to enhance your AI assistant
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {connectedTools.map((tool) => (
                        <div
                          key={tool.id}
                          className='group relative flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200'>
                          <div className='flex items-start gap-3 flex-1 min-w-0'>
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                                tool.color
                              )}>
                              {tool.icon}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2'>
                                <div className='text-sm font-semibold text-gray-900'>
                                  {tool.name}
                                </div>
                                {tool.isEnabled && (
                                  <div className='flex items-center gap-1'>
                                    <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                                    <span className='text-xs text-green-600 font-medium'>
                                      Active
                                    </span>
                                  </div>
                                )}
                              </div>
                              {tool.description && (
                                <div className='text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed'>
                                  {tool.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className='flex items-center gap-3 flex-shrink-0'>
                            <Switch
                              checked={tool.isEnabled}
                              onCheckedChange={(enabled) => {
                                console.log(
                                  "Switch clicked for tool:",
                                  tool.id,
                                  tool.name,
                                  "enabled:",
                                  enabled
                                );
                                handleToolToggle(tool.id, enabled);
                              }}
                            />
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log(
                                  "Removing tool:",
                                  tool.id,
                                  tool.name
                                );
                                handleRemoveTool(tool.id);
                              }}
                              className='w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100'
                              title='Remove Tool'>
                              <X className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
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
              </CollapsibleContent>
            </Collapsible>

            {/* Enhanced Execution Details */}
            {(data.status === "running" ||
              data.status === "completed" ||
              data.status === "error") && (
              <Collapsible
                open={sectionsOpen.executionDetails}
                onOpenChange={(open) =>
                  setSectionsOpen((prev) => ({
                    ...prev,
                    executionDetails: open,
                  }))
                }
                className='mb-4'>
                <CollapsibleTrigger className='flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors mb-2'>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform",
                      sectionsOpen.executionDetails && "rotate-90"
                    )}
                  />
                  Execution Details
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className='space-y-4'>
                    {/* Thinking Process */}
                    {console.log(
                      "AI Agent thinking steps:",
                      data.thinkingSteps
                    )}
                    {data.thinkingSteps && data.thinkingSteps.length > 0 && (
                      <div>
                        <h4 className='text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2'>
                          <Brain className='w-4 h-4' />
                          Thinking Process
                          <span className='text-xs text-gray-500'>
                            ({data.thinkingSteps.length} steps)
                          </span>
                        </h4>
                        <div className='space-y-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3'>
                          {data.thinkingSteps.map((step, index) => {
                            const stepData = step as Record<string, unknown>;
                            return (
                              <div
                                key={index}
                                className='text-xs bg-white p-2 rounded border border-gray-200'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <span className='font-medium text-blue-600'>
                                    {stepData.type as string}
                                  </span>
                                  <span className='text-gray-400'>•</span>
                                  <span className='text-gray-500'>
                                    Step {index + 1}
                                  </span>
                                </div>
                                <div className='text-gray-700 leading-relaxed'>
                                  {(stepData.reasoning as string) ||
                                    (stepData.content as string)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Show message when no thinking steps */}
                    {(!data.thinkingSteps ||
                      data.thinkingSteps.length === 0) && (
                      <div className='text-center py-4'>
                        <div className='text-gray-400 mb-2'>
                          <Brain className='w-8 h-8 mx-auto' />
                        </div>
                        <div className='text-sm text-gray-500 font-medium'>
                          No thinking steps captured
                        </div>
                        <div className='text-xs text-gray-400 mt-1'>
                          Enable "Save Thinking Process" to see AI reasoning
                        </div>
                      </div>
                    )}

                    {/* Tool Calls */}
                    {data.toolCalls && data.toolCalls.length > 0 && (
                      <div>
                        <h4 className='text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2'>
                          <Zap className='w-4 h-4' />
                          Tool Calls
                          <span className='text-xs text-gray-500'>
                            ({data.toolCalls.length} calls)
                          </span>
                        </h4>
                        <div className='space-y-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3'>
                          {data.toolCalls.map((call, index) => {
                            const callData = call as Record<string, unknown>;
                            return (
                              <div
                                key={index}
                                className='text-xs bg-white p-2 rounded border border-gray-200'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <span className='font-medium text-green-600'>
                                    {callData.tool as string}
                                  </span>
                                  <span className='text-gray-400'>•</span>
                                  <span className='text-gray-500'>
                                    Call {index + 1}
                                  </span>
                                  {callData.status && (
                                    <>
                                      <span className='text-gray-400'>•</span>
                                      <span
                                        className={`text-xs px-1 rounded ${
                                          callData.status === "success"
                                            ? "bg-green-100 text-green-700"
                                            : callData.status === "error"
                                              ? "bg-red-100 text-red-700"
                                              : "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        {callData.status as string}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {callData.parameters && (
                                  <div className='text-gray-600 mb-1'>
                                    <span className='font-medium'>
                                      Parameters:
                                    </span>{" "}
                                    {JSON.stringify(callData.parameters)}
                                  </div>
                                )}
                                {callData.result && (
                                  <div className='text-gray-600'>
                                    <span className='font-medium'>Result:</span>{" "}
                                    {typeof callData.result === "string"
                                      ? callData.result
                                      : JSON.stringify(callData.result)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Execution Details */}
                    {data.status === "completed" && (
                      <div>
                        <h4 className='text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2'>
                          <CheckCircle className='w-4 h-4' />
                          Execution Summary
                        </h4>
                        <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
                          <div className='text-xs text-green-700'>
                            <div className='flex items-center gap-2 mb-1'>
                              <CheckCircle className='w-3 h-3' />
                              <span className='font-medium'>
                                Execution completed successfully
                              </span>
                            </div>
                            {data.executionProgress && (
                              <div className='text-gray-600'>
                                Progress: {Math.round(data.executionProgress)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Details */}
                    {data.status === "error" && (
                      <div>
                        <h4 className='text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2'>
                          <AlertCircle className='w-4 h-4' />
                          Error Details
                        </h4>
                        <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
                          <div className='text-xs text-red-700'>
                            <div className='flex items-center gap-2 mb-1'>
                              <AlertCircle className='w-3 h-3' />
                              <span className='font-medium'>
                                Execution failed
                              </span>
                            </div>
                            {data.executionError && (
                              <div className='text-red-600 mt-1'>
                                {data.executionError}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Real-time Execution Logs */}
                    {data.logs && data.logs.length > 0 && (
                      <div>
                        <h4 className='text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2'>
                          <Clock className='w-4 h-4' />
                          Execution Logs
                          <span className='text-xs text-gray-500'>
                            ({data.logs.length} entries)
                          </span>
                        </h4>
                        <div className='space-y-1 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3'>
                          {data.logs.slice(-10).map((log, index) => (
                            <div
                              key={index}
                              className={`text-xs p-2 rounded border ${
                                log.level === "error"
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : log.level === "warn"
                                    ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                                    : "bg-white border-gray-200 text-gray-700"
                              }`}>
                              <div className='flex items-center gap-2 mb-1'>
                                <span className='font-medium'>
                                  {log.timestamp.split("T")[1]?.split(".")[0] ||
                                    log.timestamp}
                                </span>
                                <span className='text-gray-400'>•</span>
                                <span
                                  className={`text-xs px-1 rounded ${
                                    log.level === "error"
                                      ? "bg-red-100 text-red-700"
                                      : log.level === "warn"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-blue-100 text-blue-700"
                                  }`}>
                                  {log.level.toUpperCase()}
                                </span>
                              </div>
                              <div className='text-gray-600 leading-relaxed'>
                                {log.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Live Thinking Panel */}
          {(data.status === "running" ||
            data.status === "completed" ||
            data.status === "error") && (
            <Collapsible
              open={sectionsOpen.liveThinking}
              onOpenChange={(open) =>
                setSectionsOpen((prev) => ({ ...prev, liveThinking: open }))
              }
              className='mb-4'>
              <LiveThinkingPanel
                nodeId={id}
                thinkingSteps={
                  (data.thinkingSteps as any[])?.map((step, index) => ({
                    id: step.id || `step-${index}`,
                    type: step.type || "reasoning",
                    content: step.content || step.reasoning || "",
                    timestamp: step.timestamp || new Date().toISOString(),
                    reasoning: step.reasoning,
                    tool: step.tool,
                    parameters: step.parameters,
                    result: step.result,
                    status: step.status,
                    duration: step.duration,
                  })) || []
                }
                toolCalls={
                  (data.toolCalls as any[])?.map((call, index) => ({
                    id: call.id || `tool-${index}`,
                    tool: call.tool || call.name || "unknown",
                    parameters: call.parameters || call.args || {},
                    result: call.result,
                    status: call.status || "completed",
                    timestamp: call.timestamp || new Date().toISOString(),
                    duration: call.duration,
                    error: call.error,
                  })) || []
                }
                logs={
                  (data.logs as any[])?.map((log, index) => ({
                    id: log.id || `log-${index}`,
                    timestamp: log.timestamp || new Date().toISOString(),
                    level: log.level || "info",
                    message: log.message || "",
                    nodeId: id,
                    context: log.metadata,
                  })) || []
                }
                isThinking={data.status === "running"}
                executionStatus={
                  data.status === "error" ? "failed" : data.status
                }
                defaultExpanded={sectionsOpen.liveThinking}
                showTimestamps={true}
                maxHeight='300px'
                className='border-0 bg-transparent'
              />
            </Collapsible>
          )}

          <Handle
            type='target'
            position={Position.Left}
            id={`${id}-target`}
            className='!w-4 !h-4 !bg-blue-500 !border-2 !border-background'
          />
        </div>

        {/* Expanded Configuration Panel */}
        {isExpanded && (
          <div className='w-[300px] flex-shrink-0 bg-muted/50 backdrop-blur-sm border-l border-border'>
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
                      <SelectItem value='collaborative'>
                        Collaborative
                      </SelectItem>
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
                            <div className='text-sm font-medium'>
                              {tool.name}
                            </div>
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
                      checked={data.config?.execution?.saveThinking !== false} // Default to true
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
        <Handle
          type='source'
          position={Position.Right}
          id={`${id}-source`}
          className='!w-4 !h-4 !bg-blue-500 !border-2 !border-background'
        />
      </div>
    </>
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

  // Initialize connectedTools from config data and clean up duplicates
  useEffect(() => {
    const selectedTools = (config.selectedTools as Array<any>) || [];
    if (selectedTools.length > 0) {
      // Remove duplicates from selectedTools
      const uniqueTools = selectedTools.filter(
        (tool: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => t.id === tool.id)
      );

      // If duplicates were found, update the config
      if (uniqueTools.length !== selectedTools.length) {
        console.log(
          `Removed ${
            selectedTools.length - uniqueTools.length
          } duplicate tools from config`
        );
        onChange({
          ...config,
          selectedTools: uniqueTools,
        });
      }

      // Convert selectedTools to ToolNode format
      const toolsFromConfig = uniqueTools.map((tool: any) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description || "",
        category: tool.category || "ai",
        type: tool.type,
        icon: toolIcons[tool.category || "ai"] || toolIcons.ai,
        color: toolColors[tool.category || "ai"] || toolColors.ai,
        isConnected: true,
        isEnabled: tool.enabled !== false, // Default to true unless explicitly false
        config: tool.config || {},
      }));

      setConnectedTools(toolsFromConfig);
    }
  }, [config.selectedTools, onChange]);

  const handleAddClick = (type: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPopover(popover === type ? null : type);
  };

  const handleSelect = (item: ToolNode) => {
    // Check if tool already exists to prevent duplicates
    const existingTool = connectedTools.find((t) => t.id === item.id);
    if (existingTool) {
      console.log(`Tool ${item.name} already exists, skipping duplicate`);
      setPopover(null);
      return;
    }

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
        description?: string;
        category?: string;
        enabled?: boolean;
      }>) || [];

    // Check if tool already exists in config to prevent duplicates
    const toolExistsInConfig = currentSelectedTools.some(
      (t) => t.id === item.id
    );

    if (toolExistsInConfig) {
      console.log(
        `Tool ${item.name} already exists in config, skipping duplicate`
      );
      return;
    }

    const newSelectedTool = {
      id: item.id,
      name: item.name,
      type: item.type,
      config: item.config || {},
      description: item.description,
      category: item.category,
      enabled: true,
    };

    handleConfigUpdate({
      selectedTools: [...currentSelectedTools, newSelectedTool],
    });
  };

  const handleRemoveTool = (toolId: string) => {
    console.log("AIAgentConfig handleRemoveTool called with toolId:", toolId);
    console.log("Current connectedTools before removal:", connectedTools);

    setConnectedTools((prev) => {
      const filtered = prev.filter((tool) => tool.id !== toolId);
      console.log("ConnectedTools after filtering:", filtered);
      return filtered;
    });

    // Update the selectedTools in the config
    const currentSelectedTools =
      (config.selectedTools as Array<{
        id: string;
        name: string;
        type: string;
        config?: Record<string, unknown>;
        description?: string;
        category?: string;
        enabled?: boolean;
      }>) || [];

    console.log("Current selectedTools in config:", currentSelectedTools);

    const updatedSelectedTools = currentSelectedTools.filter(
      (tool) => tool.id !== toolId
    );

    console.log("Updated selectedTools after filtering:", updatedSelectedTools);

    handleConfigUpdate({
      selectedTools: updatedSelectedTools,
    });
  };

  const handleConfigUpdate = (updates: Record<string, unknown>) => {
    // Special handling for selectedTools - always replace, never merge
    let newConfig: Record<string, unknown>;
    if (updates.selectedTools !== undefined) {
      // For selectedTools, always replace the entire array
      newConfig = {
        ...config,
        selectedTools: updates.selectedTools,
      };
    } else {
      // Deep merge function to properly handle nested objects for other properties
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

      newConfig = deepMerge(config, updates);
    }

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
                    maxSteps: Number.parseInt(e.target.value),
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
              availableTools.map((tool) => {
                const isConnected = connectedTools.some(
                  (t) => t.id === tool.id && t.isEnabled
                );
                return (
                  <div
                    key={tool.id}
                    className={`group relative flex items-center justify-between p-4 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
                      isConnected
                        ? "bg-white border-green-200 shadow-sm"
                        : "bg-gray-50 border-gray-200"
                    }`}>
                    <div className='flex items-start gap-3 flex-1 min-w-0'>
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                          tool.color
                        )}>
                        {tool.icon}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <div className='text-sm font-semibold text-gray-900'>
                            {tool.name}
                          </div>
                          {isConnected && (
                            <div className='flex items-center gap-1'>
                              <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                              <span className='text-xs text-green-600 font-medium'>
                                Connected
                              </span>
                            </div>
                          )}
                        </div>
                        {tool.description && (
                          <div className='text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed'>
                            {tool.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='flex-shrink-0'>
                      <Switch
                        checked={isConnected}
                        onCheckedChange={(enabled) => {
                          if (enabled) {
                            handleSelect(tool);
                          } else {
                            handleRemoveTool(tool.id);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })
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
                    ?.saveThinking as boolean) !== false // Default to true
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
                    timeout: Number.parseInt(e.target.value),
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
