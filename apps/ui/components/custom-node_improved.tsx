import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NodeExecutionUpdate,
  useExecutionWebSocket,
} from "@/hooks/use-execution-websocket";
import { useBlockExecution } from "@/hooks/useBlockExecution";
import { cn } from "@/lib/utils";
import { Handle, Position, useConnection } from "@xyflow/react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  Loader2,
  Radio,
  Settings,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useState } from "react";
import { getNodeSchema } from "./schema-aware-connection";
// Define NodeSchema type locally since it's not exported
interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "any";
  required: boolean;
  description?: string;
}
interface NodeSchema {
  input: SchemaField[];
  output: SchemaField[];
}
import { useLiveNode } from "./workflow/LiveWorkflowProvider";

interface CompatibilityIssue {
  field: string;
  issue: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

interface NodeData {
  blockType: string;
  label: string;
  nodeType: string;
  description?: string;
  isValid?: boolean;
  isEnabled?: boolean;
  inputCount?: number;
  outputCount?: number;
  status?: string;
  executionStatus?: "pending" | "running" | "completed" | "failed";
  isExecuting?: boolean;
  executionProgress?: number;
  executionStartTime?: Date;
  executionEndTime?: Date;
  executionDuration?: number;
  executionOutput?: any;
  executionError?: string;
  config?: Record<string, unknown>;
  iconName?: string;
  style?: {
    width?: number;
    height?: number;
    accentColor?: string;
    backgroundColor?: string;
    [key: string]: unknown;
  };
  logs?: Array<{
    level: "info" | "warn" | "error";
    message: string;
    timestamp?: string;
  }>;
  // Real-time execution data
  executionId?: string;
  workflowId?: string;
  isLive?: boolean;
}

export default function CustomNode({
  id,
  data,
}: {
  id: string;
  data: NodeData;
}) {
  const { theme } = useTheme();
  const connection = useConnection() as ReturnType<typeof useConnection>;
  const isConnecting = connection.inProgress;
  const isTarget = isConnecting && connection.fromNode?.id !== id;
  const [showLogs, setShowLogs] = useState(false);

  // Destructure config and other fields from data at the top
  const {
    label = data.blockType || "Node",
    description = "",
    isEnabled = true,
    config = {},
    style = {},
  } = data;

  // Real-time execution state
  const [realtimeStatus, setRealtimeStatus] = useState<
    "pending" | "running" | "completed" | "failed"
  >("pending");
  const [realtimeProgress, setRealtimeProgress] = useState<number>(0);
  const [realtimeDuration, setRealtimeDuration] = useState<
    number | undefined
  >();
  const [realtimeError, setRealtimeError] = useState<string | undefined>();
  const [realtimeLogs, setRealtimeLogs] = useState<
    Array<{
      level: "info" | "warn" | "error";
      message: string;
      timestamp?: string;
    }>
  >([]);
  const [isLiveExecution, setIsLiveExecution] = useState(false);

  // Initialize block execution monitoring (legacy)
  const blockExecution = useBlockExecution({
    blockId: id,
    blockType: data.blockType,
    blockName: data.label,
  });

  // Use the new live node system for real-time updates
  const liveNode = useLiveNode(id);

  // Handle real-time node updates from WebSocket (legacy)
  const handleNodeUpdate = useCallback(
    (update: NodeExecutionUpdate) => {
      if (update.nodeId === id) {
        setRealtimeStatus(update.status);
        setRealtimeProgress(update.progress || 0);
        setRealtimeDuration(update.duration);
        setRealtimeError(update.error);
        setIsLiveExecution(true);

        // Only push logs with valid levels
        const logLevel: "info" | "warn" | "error" =
          update.status === "failed" ? "error" : "info";
        setRealtimeLogs((prev) => {
          const newLog = {
            level: logLevel as "info" | "warn" | "error",
            message: `Node ${update.status}: ${update.nodeLabel || data.label}`,
            timestamp: new Date().toISOString(),
          };
          // Only allow logs with valid levels
          return [...prev, newLog].filter(
            (
              log
            ): log is {
              level: "info" | "warn" | "error";
              message: string;
              timestamp?: string;
            } =>
              log.level === "info" ||
              log.level === "warn" ||
              log.level === "error"
          );
        });
      }
    },
    [id, data.label]
  );

  // Initialize WebSocket connection for real-time updates (legacy)
  const { isConnected: wsConnected } = useExecutionWebSocket({
    executionId: data.executionId,
    onNodeUpdate: handleNodeUpdate,
    onExecutionLog: (log) => {
      if (log.nodeId === id) {
        setRealtimeLogs((prev) => [
          ...prev,
          {
            level: log.level as "info" | "warn" | "error",
            message: log.message,
            timestamp: log.timestamp.toISOString(),
          },
        ]);
      }
    },
  });

  // Schema-aware state variables
  const [nodeSchema, setNodeSchema] = useState<NodeSchema | null>(null);
  const [compatibilityIssues, setCompatibilityIssues] = useState<
    CompatibilityIssue[]
  >([]);
  const [showSchemaInfo, setShowSchemaInfo] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showError, setShowError] = useState(false);

  // Reset real-time state when execution changes
  useEffect(() => {
    if (data.executionId) {
      setRealtimeStatus("pending");
      setRealtimeProgress(0);
      setRealtimeDuration(undefined);
      setRealtimeError(undefined);
      setRealtimeLogs([]);
      setIsLiveExecution(false);
    }
  }, [data.executionId]);

  // Initialize node schema based on block type
  useEffect(() => {
    if (data.blockType) {
      try {
        const schema = getNodeSchema(data.blockType, config);
        setNodeSchema(schema);
      } catch (error) {
        console.warn(`Failed to get schema for ${data.blockType}:`, error);
        setNodeSchema(null);
      }
    }
  }, [data.blockType, config]);

  // Check compatibility with connected nodes (simplified version)
  useEffect(() => {
    if (nodeSchema && connection.inProgress) {
      // During connection, perform basic compatibility checks
      const issues: CompatibilityIssue[] = [];

      // This is a simplified check - in a full implementation,
      // you'd need access to the source node's schema
      if (connection.fromNode && connection.fromNode.id !== id) {
        // Check if we have required inputs
        const requiredInputs = nodeSchema.input.filter(
          (field: SchemaField) => field.required
        );
        if (requiredInputs.length > 0) {
          issues.push({
            field: "connection",
            issue: `This node requires ${requiredInputs.length} input field(s)`,
            severity: "info",
            suggestion: "Ensure the source node provides the required data",
          });
        }
      }

      setCompatibilityIssues(issues);
    } else {
      setCompatibilityIssues([]);
    }
  }, [nodeSchema, connection, id]);

  // Use live node data when available with enhanced status detection
  const isUsingLiveNode = liveNode.isLive && liveNode.nodeState;
  const effectiveStatus = isUsingLiveNode
    ? liveNode.nodeState?.status || "pending"
    : isLiveExecution && data.executionId
      ? realtimeStatus
      : data.executionStatus || blockExecution.currentState || "idle";

  // Enhanced status detection for better user feedback
  const getDisplayStatus = ():
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "idle" => {
    if (effectiveStatus === "running" || data.isExecuting) return "running";
    if (effectiveStatus === "completed" && data.executionOutput)
      return "completed";
    if (effectiveStatus === "failed" || data.executionError) return "failed";
    if (data.executionId && !isConnectedToLive) return "pending";
    return "idle";
  };

  const displayStatus = getDisplayStatus();

  const effectiveLogs = isUsingLiveNode
    ? liveNode.nodeState?.logs || []
    : isLiveExecution
      ? realtimeLogs
      : data.logs || blockExecution.currentBlock?.logs || [];

  const effectiveProgress = isUsingLiveNode
    ? liveNode.nodeState?.progress
    : isLiveExecution
      ? realtimeProgress
      : data.executionProgress;

  const effectiveDuration = isUsingLiveNode
    ? liveNode.nodeState?.duration
    : isLiveExecution
      ? realtimeDuration
      : data.executionDuration || blockExecution.currentBlock?.duration;

  const effectiveError = isUsingLiveNode
    ? liveNode.nodeState?.error
    : isLiveExecution
      ? realtimeError
      : data.executionError;

  const isConnectedToLive = isUsingLiveNode
    ? liveNode.isConnected
    : wsConnected;

  // Apply style configurations
  const nodeWidth = style.width || 280;
  const nodeHeight = style.height;
  const accentColor = style.accentColor || "primary";
  const backgroundColor = style.backgroundColor || "bg-card";

  // Enhanced Status Indicator with real-time execution data and animations
  const statusIndicator = React.useMemo(() => {
    const logs = effectiveLogs;
    const duration = effectiveDuration;
    const progress = effectiveProgress;
    const error = effectiveError;
    const output = data.executionOutput;

    switch (displayStatus) {
      case "pending":
        return (
          <div className='flex items-center gap-1.5 text-amber-500'>
            <div className='w-3.5 h-3.5 rounded-full bg-amber-300 animate-pulse' />
            <span className='text-xs font-medium'>Pending</span>
            {data.isExecuting && (
              <div className='ml-2 text-xs text-amber-600'>
                Queued for execution
              </div>
            )}
          </div>
        );
      case "running":
        return (
          <div className='flex items-center gap-1.5 text-blue-500'>
            <div className='relative'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              <div className='absolute -inset-1 bg-blue-500/20 rounded-full animate-ping' />
            </div>
            <div className='flex flex-col'>
              <span className='text-xs font-medium'>Running...</span>
              {progress && (
                <div className='flex items-center gap-1'>
                  <div className='w-16 h-1.5 bg-blue-200 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-blue-500 transition-all duration-300 ease-out'
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className='text-xs text-blue-600'>
                    {Math.round(progress)}%
                  </span>
                </div>
              )}
              {duration && (
                <span className='text-xs text-blue-600'>
                  {duration}ms elapsed
                </span>
              )}
            </div>
            <div className='flex gap-1'>
              {logs.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogs(true);
                  }}
                  className='text-xs px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 transition-colors'>
                  Logs ({logs.length})
                </button>
              )}
              {output && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOutput(true);
                  }}
                  className='text-xs px-1.5 py-0.5 bg-green-100 hover:bg-green-200 rounded text-green-700 transition-colors'>
                  Output
                </button>
              )}
            </div>
          </div>
        );
      case "completed":
        return (
          <div className='flex items-center gap-1.5 text-green-500'>
            <div className='relative'>
              <CheckCircle2 className='w-3.5 h-3.5' />
              <div className='absolute -inset-1 bg-green-500/20 rounded-full animate-pulse' />
            </div>
            <div className='flex flex-col'>
              <span className='text-xs font-medium'>
                Completed {duration && `(${duration}ms)`}
              </span>
              {output && (
                <span className='text-xs text-green-600'>
                  Data ready for next block
                </span>
              )}
            </div>
            <div className='flex gap-1'>
              {logs.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogs(true);
                  }}
                  className='text-xs px-1.5 py-0.5 bg-green-100 hover:bg-green-200 rounded text-green-700 transition-colors'>
                  Logs
                </button>
              )}
              {output && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOutput(true);
                  }}
                  className='text-xs px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 transition-colors'>
                  View Data
                </button>
              )}
            </div>
          </div>
        );
      case "failed":
        return (
          <div className='flex items-center gap-1.5 text-red-500'>
            <div className='relative'>
              <XCircle className='w-3.5 h-3.5' />
              <div className='absolute -inset-1 bg-red-500/20 rounded-full animate-pulse' />
            </div>
            <div className='flex flex-col'>
              <span className='text-xs font-medium'>Failed</span>
              {error && (
                <span className='text-xs text-red-600 truncate max-w-32'>
                  {error}
                </span>
              )}
              {duration && (
                <span className='text-xs text-red-600'>
                  Failed after {duration}ms
                </span>
              )}
            </div>
            <div className='flex gap-1'>
              {logs.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogs(true);
                  }}
                  className='text-xs px-1.5 py-0.5 bg-red-100 hover:bg-red-200 rounded text-red-700 transition-colors'>
                  Logs ({logs.length})
                </button>
              )}
              {error && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowError(true);
                  }}
                  className='text-xs px-1.5 py-0.5 bg-red-100 hover:bg-red-200 rounded text-red-700 transition-colors'>
                  Details
                </button>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className='flex items-center gap-1.5 text-gray-400'>
            <div className='w-3.5 h-3.5 rounded-full bg-gray-300' />
            <span className='text-xs font-medium'>Idle</span>
          </div>
        );
    }
  }, [
    effectiveStatus,
    effectiveLogs,
    effectiveDuration,
    effectiveProgress,
    effectiveError,
  ]);

  // Live connection indicator
  const liveIndicator = React.useMemo(() => {
    // Show live indicator if using new live node system
    if (isUsingLiveNode) {
      return (
        <div className='absolute -top-1 -right-1 flex items-center'>
          <div className='relative'>
            <Radio className='w-3 h-3 text-emerald-500' />
            <div className='absolute -inset-1 bg-emerald-500/30 rounded-full animate-ping' />
          </div>
        </div>
      );
    }

    // Fallback to legacy WebSocket indicator
    if (!data.executionId) return null;

    if (wsConnected && isLiveExecution) {
      return (
        <div className='absolute -top-1 -right-1 flex items-center'>
          <div className='relative'>
            <Activity className='w-3 h-3 text-green-500' />
            <div className='absolute -inset-1 bg-green-500/30 rounded-full animate-ping' />
          </div>
        </div>
      );
    } else if (data.executionId && wsConnected) {
      return (
        <div className='absolute -top-1 -right-1 flex items-center'>
          <Zap className='w-3 h-3 text-blue-500 animate-pulse' />
        </div>
      );
    }

    return null;
  }, [isUsingLiveNode, wsConnected, isLiveExecution, data.executionId]);

  const configSummary = Object.entries(config)
    .filter(([key]) => key && key !== "blockType" && key !== "label")
    .slice(0, 3)
    .map(([key, value]) => {
      // Special handling for customBlockId to show shortened version but preserve full value
      const displayValue =
        key === "customBlockId" &&
        typeof value === "string" &&
        value.length > 20
          ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
          : String(value) || "Not set";

      return (
        <div key={key} className='flex justify-between items-center text-xs'>
          <span className='text-muted-foreground font-mono'>{key}:</span>
          <span
            className='font-semibold text-foreground/90'
            title={String(value)}>
            {displayValue}
          </span>
        </div>
      );
    });

  // Get accent color classes with schema compatibility colors
  const getAccentColorClasses = (color: string) => {
    // Override color based on compatibility issues
    if (compatibilityIssues.length > 0) {
      const hasErrors = compatibilityIssues.some(
        (issue) => issue.severity === "error"
      );
      const hasWarnings = compatibilityIssues.some(
        (issue) => issue.severity === "warning"
      );

      if (hasErrors) {
        return "bg-red-500/10 text-red-600 border-red-500/20";
      } else if (hasWarnings) {
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      }
    }

    switch (color) {
      case "blue":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "green":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "red":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "yellow":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "purple":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "orange":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "secondary":
        return "bg-secondary/10 text-secondary-foreground border-secondary/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  // Schema compatibility indicator
  const schemaIndicator = React.useMemo(() => {
    if (!nodeSchema || compatibilityIssues.length === 0) return null;

    const hasErrors = compatibilityIssues.some(
      (issue) => issue.severity === "error"
    );
    const hasWarnings = compatibilityIssues.some(
      (issue) => issue.severity === "warning"
    );

    if (hasErrors) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertCircle className='w-3 h-3 text-red-500' />
            </TooltipTrigger>
            <TooltipContent>
              <div className='text-xs max-w-48'>
                <div className='font-medium mb-1'>Schema Issues:</div>
                {compatibilityIssues.slice(0, 3).map((issue, idx) => (
                  <div key={idx} className='mb-1'>
                    <div className='text-red-400'>
                      {issue.field}: {issue.issue}
                    </div>
                    {issue.suggestion && (
                      <div className='text-gray-300 text-xs'>
                        {issue.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (hasWarnings) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className='w-3 h-3 text-yellow-500' />
            </TooltipTrigger>
            <TooltipContent>
              <div className='text-xs max-w-48'>
                <div className='font-medium mb-1'>Schema Warnings:</div>
                {compatibilityIssues.slice(0, 3).map((issue, idx) => (
                  <div key={idx} className='mb-1'>
                    <div className='text-yellow-400'>
                      {issue.field}: {issue.issue}
                    </div>
                    {issue.suggestion && (
                      <div className='text-gray-300 text-xs'>
                        {issue.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return null;
  }, [nodeSchema, compatibilityIssues]);

  // Use the effective values determined above
  const status = effectiveStatus;
  const currentLogs = effectiveLogs;
  const currentDuration = effectiveDuration;
  const currentError = effectiveError;

  return (
    <div
      className={cn(
        "custom-node rounded-xl border shadow-sm transition-all duration-200 relative",
        backgroundColor,
        !isEnabled && "opacity-50 grayscale",
        isTarget
          ? "border-2 border-primary shadow-lg shadow-primary/20"
          : "border-border/30",
        theme === "dark" && !isTarget && "shadow-black/20",
        // Enhanced status-based styling with live execution feedback
        status === "running" &&
          (isUsingLiveNode || isLiveExecution
            ? "animate-pulse border-blue-500 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20"
            : "animate-pulse border-blue-500 shadow-lg shadow-blue-500/30"),
        status === "completed" &&
          (isUsingLiveNode || isLiveExecution
            ? "border-green-500 shadow-lg shadow-green-500/20 ring-2 ring-green-500/20"
            : "border-green-500 shadow-lg shadow-green-500/20"),
        status === "failed" &&
          (isUsingLiveNode || isLiveExecution
            ? "border-red-500 shadow-lg shadow-red-500/20 ring-2 ring-red-500/20"
            : "border-red-500 shadow-lg shadow-red-500/20"),
        // Live connection indicators
        isUsingLiveNode && "ring-1 ring-emerald-500/20",
        isConnectedToLive && data.executionId && "ring-1 ring-blue-500/10"
      )}
      style={{
        width: nodeWidth,
        height: nodeHeight ? `${nodeHeight}px` : "auto",
        minHeight: nodeHeight ? `${nodeHeight}px` : undefined,
      }}>
      {/* Live execution indicator */}
      {liveIndicator}
      {/* Header */}
      <div
        className={cn(
          "custom-drag-handle flex items-center gap-3 p-3 rounded-t-lg border-b cursor-grab relative z-10",
          isTarget ? "border-primary/20" : "border-border/80"
        )}>
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg",
            isTarget
              ? getAccentColorClasses(accentColor)
              : getAccentColorClasses(accentColor)
          )}>
          {/* icon is not defined in the provided code, so it's removed */}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-bold text-sm truncate text-foreground'>
            {label}
          </div>
        </div>

        {/* Schema compatibility indicator */}
        {schemaIndicator && (
          <div className='flex items-center gap-1'>{schemaIndicator}</div>
        )}

        {/* Schema info toggle */}
        {nodeSchema && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Use a span instead of a button to avoid nested <button> */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSchemaInfo(!showSchemaInfo);
                  }}
                  className='text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer'
                  title='View schema details'
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setShowSchemaInfo(!showSchemaInfo);
                    }
                  }}>
                  <Settings className='w-3 h-3' />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className='text-xs'>View schema details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Body */}
      <div className='p-3 space-y-2 relative z-10 flex-1'>
        {description && (
          <p className='text-xs text-muted-foreground pb-1 border-b border-dashed border-border/80'>
            {description}
          </p>
        )}
        <div className='space-y-1.5'>{configSummary}</div>

        {/* Schema information panel */}
        {showSchemaInfo && nodeSchema && (
          <div className='mt-2 p-2 bg-muted/50 rounded border border-dashed'>
            <div className='text-xs'>
              <div className='font-medium mb-1 text-muted-foreground'>
                Schema:
              </div>
              <div className='space-y-1'>
                <div className='flex justify-between'>
                  <span>Inputs:</span>
                  <Badge variant='outline' className='text-xs py-0 px-1'>
                    {nodeSchema.input.length}
                  </Badge>
                </div>
                <div className='flex justify-between'>
                  <span>Outputs:</span>
                  <Badge variant='outline' className='text-xs py-0 px-1'>
                    {nodeSchema.output.length}
                  </Badge>
                </div>
                {nodeSchema.input.some((f: SchemaField) => f.required) && (
                  <div className='flex justify-between text-red-600'>
                    <span>Required:</span>
                    <Badge variant='destructive' className='text-xs py-0 px-1'>
                      {
                        nodeSchema.input.filter((f: SchemaField) => f.required)
                          .length
                      }
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {statusIndicator && (
          <div className='pt-2 mt-2 border-t border-dashed border-border/80'>
            {statusIndicator}
          </div>
        )}

        {/* Connection Status Indicator */}
        {data.executionId && (
          <div className='pt-2 mt-2 border-t border-dashed border-border/80'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>Connection:</span>
              <div className='flex items-center gap-1'>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnectedToLive
                      ? "bg-green-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
                <span
                  className={
                    isConnectedToLive ? "text-green-600" : "text-red-600"
                  }>
                  {isConnectedToLive ? "Live" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Handles - styled to cover the entire node */}
      <Handle
        type='target'
        position={Position.Left}
        className='react-flow__handle-target'
        style={{
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          transform: "none",
          borderRadius: "12px",
          background: "transparent",
          border: "none",
          opacity: 0,
          pointerEvents: "all",
        }}
      />
      <Handle
        type='source'
        position={Position.Right}
        className='react-flow__handle-source'
        style={{
          width: "100%",
          height: "100%",
          top: 0,
          right: 0,
          transform: "none",
          borderRadius: "12px",
          background: "transparent",
          border: "none",
          opacity: 0,
          pointerEvents: "all",
        }}
      />

      {/* Log Viewer Modal */}
      {showLogs && (
        <div className='absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-w-md'>
          <div className='flex items-center justify-between p-3 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Eye className='w-4 h-4 text-muted-foreground' />
              <span className='text-sm font-medium'>Execution Logs</span>
            </div>
            <button
              onClick={() => setShowLogs(false)}
              className='text-muted-foreground hover:text-foreground transition-colors'
              title='Close logs'>
              <X className='w-4 h-4' />
            </button>
          </div>
          <div className='p-3 max-h-64 overflow-y-auto'>
            {currentLogs && currentLogs.length > 0 ? (
              <div className='space-y-2'>
                {currentLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-xs p-2 rounded",
                      log.level === "error"
                        ? "bg-red-50 text-red-700 border-l-2 border-red-500"
                        : log.level === "warn"
                          ? "bg-yellow-50 text-yellow-700 border-l-2 border-yellow-500"
                          : "bg-gray-50 text-gray-700 border-l-2 border-gray-400"
                    )}>
                    <div className='font-mono'>{log.message}</div>
                    <div className='text-xs text-muted-foreground mt-1'>
                      {log.timestamp || "Just now"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-4 text-muted-foreground'>
                <Database className='w-8 h-8 mx-auto mb-2 opacity-50' />
                <p className='text-sm'>No logs available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Output Data Modal */}
      {showOutput && data.executionOutput && (
        <div className='absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-w-lg'>
          <div className='flex items-center justify-between p-3 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Database className='w-4 h-4 text-green-600' />
              <span className='text-sm font-medium'>Output Data</span>
            </div>
            <button
              onClick={() => setShowOutput(false)}
              className='text-muted-foreground hover:text-foreground transition-colors'
              title='Close output'>
              <X className='w-4 h-4' />
            </button>
          </div>
          <div className='p-3 max-h-64 overflow-y-auto'>
            <div className='text-xs text-muted-foreground mb-2'>
              Data produced by this block
            </div>
            <div className='bg-muted p-3 rounded text-xs font-mono overflow-x-auto'>
              <pre>{JSON.stringify(data.executionOutput, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {showError && data.executionError && (
        <div className='absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-w-md'>
          <div className='flex items-center justify-between p-3 border-b border-border'>
            <div className='flex items-center gap-2'>
              <XCircle className='w-4 h-4 text-red-500' />
              <span className='text-sm font-medium'>Execution Error</span>
            </div>
            <button
              onClick={() => setShowError(false)}
              className='text-muted-foreground hover:text-foreground transition-colors'
              title='Close error details'>
              <X className='w-4 h-4' />
            </button>
          </div>
          <div className='p-3 max-h-64 overflow-y-auto'>
            <div className='bg-red-50 border border-red-200 rounded p-3'>
              <div className='text-xs text-red-700 whitespace-pre-wrap'>
                {data.executionError}
              </div>
              {effectiveDuration && (
                <div className='mt-2 text-xs text-red-600'>
                  Failed after {effectiveDuration}ms
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
