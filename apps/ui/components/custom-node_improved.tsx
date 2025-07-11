import { Handle, Position, useConnection } from "@xyflow/react";
import { Database, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import React from "react";

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
  style?: React.CSSProperties;
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

  const {
    label = data.blockType || "Node",
    description = "",
    status = "idle",
    isEnabled = true,
    config = {},
  } = data;

  const icon = <Database className='w-5 h-5' />; // TODO: Map iconName to actual icons

  // Status Indicator
  const statusIndicator = React.useMemo(() => {
    switch (status) {
      case "started":
      case "running":
        return (
          <div className='flex items-center gap-1.5 text-blue-500'>
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
            <span className='text-xs font-medium'>Running...</span>
          </div>
        );
      case "success":
      case "completed":
        return (
          <div className='flex items-center gap-1.5 text-green-500'>
            <CheckCircle2 className='w-3.5 h-3.5' />
            <span className='text-xs font-medium'>Completed</span>
          </div>
        );
      case "error":
      case "failed":
        return (
          <div className='flex items-center gap-1.5 text-red-500'>
            <XCircle className='w-3.5 h-3.5' />
            <span className='text-xs font-medium'>Failed</span>
          </div>
        );
      default:
        return null;
    }
  }, [status]);

  const configSummary = Object.entries(config)
    .filter(([key]) => key && key !== "blockType" && key !== "label")
    .slice(0, 3)
    .map(([key, value]) => (
      <div key={key} className='flex justify-between items-center text-xs'>
        <span className='text-muted-foreground font-mono'>{key}:</span>
        <span className='font-semibold text-foreground/90 truncate'>
          {String(value) || "Not set"}
        </span>
      </div>
    ));

  return (
    <div
      className={cn(
        "custom-node rounded-xl border bg-card w-[280px] shadow-sm transition-all duration-200 relative",
        !isEnabled && "opacity-50 grayscale",
        isTarget
          ? "border-2 border-primary shadow-lg shadow-primary/20"
          : "border-border/30",
        theme === "dark" && !isTarget && "shadow-black/20"
      )}
      style={data.style}>
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
              ? "bg-primary/20 text-primary"
              : "bg-primary/10 text-primary"
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
      <div className='p-3 space-y-2 relative z-10'>
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
    </div>
  );
}
