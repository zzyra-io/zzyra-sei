import { Handle, Position, useConnection } from "@xyflow/react";
import { Database, Loader2, CheckCircle2, XCircle, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import React, { useState } from "react";
import { useBlockExecution } from "@/hooks/useBlockExecution";

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
}

export default function CustomNode({
  id,
  data,
}: {
  id: string;
  data: NodeData;
}) {
  const { theme } = useTheme();
  const connection = useConnection();
  const isConnecting = connection.inProgress;
  const isTarget = isConnecting && connection.fromNode?.id !== id;
  const [showLogs, setShowLogs] = useState(false);

  // Initialize block execution monitoring
  const blockExecution = useBlockExecution({
    blockId: id,
    blockType: data.blockType,
    blockName: data.label,
  });

  const {
    label = data.blockType || "Node",
    description = "",
    isEnabled = true,
    config = {},
    style = {},
  } = data;

  // Use the monitoring system status instead of basic data.status
  const status = blockExecution.currentState || "idle";

  const icon = <Database className='w-5 h-5' />; // TODO: Map iconName to actual icons

  // Apply style configurations
  const nodeWidth = style.width || 280;
  const nodeHeight = style.height;
  const accentColor = style.accentColor || "primary";
  const backgroundColor = style.backgroundColor || "bg-card";

  // Enhanced Status Indicator with animations and log access
  const statusIndicator = React.useMemo(() => {
    const logs = blockExecution.currentBlock?.logs || [];
    const duration = blockExecution.currentBlock?.duration;

    switch (status) {
      case "queued":
        return (
          <div className='flex items-center gap-1.5 text-gray-500'>
            <div className='w-3.5 h-3.5 rounded-full bg-gray-300 animate-pulse' />
            <span className='text-xs font-medium'>Queued</span>
          </div>
        );
      case "running":
        return (
          <div className='flex items-center gap-1.5 text-blue-500 animate-pulse'>
            <div className='relative'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              <div className='absolute -inset-1 bg-blue-500/20 rounded-full animate-ping' />
            </div>
            <span className='text-xs font-medium'>Running...</span>
            {logs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogs(true);
                }}
                className='ml-1 text-xs px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 transition-colors'>
                Logs ({logs.length})
              </button>
            )}
          </div>
        );
      case "success":
        return (
          <div className='flex items-center gap-1.5 text-green-500'>
            <div className='relative'>
              <CheckCircle2 className='w-3.5 h-3.5' />
              <div className='absolute -inset-1 bg-green-500/20 rounded-full animate-pulse' />
            </div>
            <span className='text-xs font-medium'>
              Completed {duration && `(${duration}ms)`}
            </span>
            {logs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogs(true);
                }}
                className='ml-1 text-xs px-1.5 py-0.5 bg-green-100 hover:bg-green-200 rounded text-green-700 transition-colors'>
                Logs
              </button>
            )}
          </div>
        );
      case "error":
        return (
          <div className='flex items-center gap-1.5 text-red-500'>
            <div className='relative'>
              <XCircle className='w-3.5 h-3.5' />
              <div className='absolute -inset-1 bg-red-500/20 rounded-full animate-pulse' />
            </div>
            <span className='text-xs font-medium'>Failed</span>
            {logs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogs(true);
                }}
                className='ml-1 text-xs px-1.5 py-0.5 bg-red-100 hover:bg-red-200 rounded text-red-700 transition-colors'>
                Logs ({logs.length})
              </button>
            )}
          </div>
        );
      case "warning":
        return (
          <div className='flex items-center gap-1.5 text-yellow-500'>
            <div className='relative'>
              <XCircle className='w-3.5 h-3.5' />
              <div className='absolute -inset-1 bg-yellow-500/20 rounded-full animate-pulse' />
            </div>
            <span className='text-xs font-medium'>Warning</span>
            {logs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogs(true);
                }}
                className='ml-1 text-xs px-1.5 py-0.5 bg-yellow-100 hover:bg-yellow-200 rounded text-yellow-700 transition-colors'>
                Logs ({logs.length})
              </button>
            )}
          </div>
        );
      case "cancelled":
        return (
          <div className='flex items-center gap-1.5 text-gray-500'>
            <X className='w-3.5 h-3.5' />
            <span className='text-xs font-medium'>Cancelled</span>
          </div>
        );
      case "skipped":
        return (
          <div className='flex items-center gap-1.5 text-gray-400'>
            <div className='w-3.5 h-3.5 rounded-full bg-gray-300' />
            <span className='text-xs font-medium'>Skipped</span>
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
  }, [status, blockExecution.currentBlock]);

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

  // Get accent color classes
  const getAccentColorClasses = (color: string) => {
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
        // Enhanced status-based styling
        status === "running" &&
          "animate-pulse border-blue-500 shadow-lg shadow-blue-500/30",
        status === "success" &&
          "border-green-500 shadow-lg shadow-green-500/20",
        status === "error" && "border-red-500 shadow-lg shadow-red-500/20"
      )}
      style={{
        width: nodeWidth,
        height: nodeHeight ? `${nodeHeight}px` : "auto",
        minHeight: nodeHeight ? `${nodeHeight}px` : undefined,
      }}>
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
          {icon}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-bold text-sm truncate text-foreground'>
            {label}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className='p-3 space-y-2 relative z-10 flex-1'>
        {description && (
          <p className='text-xs text-muted-foreground pb-1 border-b border-dashed border-border/80'>
            {description}
          </p>
        )}
        <div className='space-y-1.5'>{configSummary}</div>
        {statusIndicator && (
          <div className='pt-2 mt-2 border-t border-dashed border-border/80'>
            {statusIndicator}
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
            {data.logs && data.logs.length > 0 ? (
              <div className='space-y-2'>
                {data.logs.map((log, index) => (
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
    </div>
  );
}
