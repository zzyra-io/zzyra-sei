import { Handle, Position, useConnection } from "@xyflow/react";
import { Database, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  config?: Record<string, any>;
  iconName?: string;
  style?: Record<string, any>;
}

export default function CustomNode({
  id,
  data,
}: {
  id: string;
  data: NodeData;
}) {
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const label = data.label || data.blockType || "Node";
  const description = data.description || "";
  const status = data.status || "idle";
  const isEnabled = data.isEnabled !== false;
  const icon = <Database className='w-5 h-5' />; // You can map iconName to actual icons if needed
  // Status indicator
  let statusColor = "bg-gray-300";
  let statusIcon = null;
  if (status === "started" || status === "running") {
    statusColor = "bg-blue-500 animate-pulse";
    statusIcon = <Loader2 className='w-3 h-3 animate-spin text-blue-500' />;
  } else if (status === "success" || status === "completed") {
    statusColor = "bg-green-500";
    statusIcon = <CheckCircle2 className='w-3 h-3 text-green-500' />;
  } else if (status === "error" || status === "failed") {
    statusColor = "bg-red-500";
    statusIcon = <XCircle className='w-3 h-3 text-red-500' />;
  }

  // Config summary (show a few key config values)
  const configSummary = data.config
    ? Object.entries(data.config)
        .filter(([k]) => k !== "")
        .slice(0, 3)
        .map(([k, v]) => (
          <div key={k} className='text-xs text-muted-foreground truncate'>
            <span className='font-medium text-foreground/80'>{k}:</span>{" "}
            {String(v)}
          </div>
        ))
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border shadow-md bg-white dark:bg-slate-900 min-w-[200px] max-w-[260px] w-full relative flex flex-col transition-all duration-200",
        !isEnabled && "opacity-60 grayscale",
        isTarget && "ring-2 ring-primary animate-pulse"
      )}
      style={{ width: data.style?.width || 220 }}>
      {/* Header */}
      <div className='flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-primary/10 to-primary/5 border-b border-muted-foreground/10'>
        <div className='flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary'>
          {icon}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-semibold text-sm truncate'>{label}</div>
        </div>
        {/* Status indicator */}
        <div
          className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center",
            statusColor
          )}>
          {statusIcon}
        </div>
      </div>
      {/* Description */}
      {description && (
        <div className='px-3 pt-1 pb-0.5 text-xs text-muted-foreground truncate'>
          {description}
        </div>
      )}
      {/* Config summary */}
      {configSummary && configSummary.length > 0 && (
        <div className='px-3 pt-1 pb-2 space-y-0.5'>{configSummary}</div>
      )}
      {/* Handles */}
      <Handle
        className='customHandle'
        position={Position.Right}
        type='source'
      />
      {/* We want to disable the target handle, if the connection was started from this node */}
      <Handle
        className='customHandle'
        position={Position.Left}
        type='target'
        isConnectableStart={false}
      />
    </div>
  );
}
