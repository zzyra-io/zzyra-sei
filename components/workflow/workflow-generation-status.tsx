"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Node } from "@/components/flow-canvas";
import {
  CheckCircle,
  Clock,
  Code,
  AlertCircle,
  Sparkles,
  Activity,
  Network,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface WorkflowGenerationStatusProps {
  status: "idle" | "preparing" | "generating" | "finalizing" | "complete" | "error";
  progress: number;
  error?: string;
  partialNodes?: Partial<Node>[];
  className?: string;
}

export const WorkflowGenerationStatus: React.FC<WorkflowGenerationStatusProps> = ({
  status,
  progress,
  error,
  partialNodes,
  className,
}) => {
  if (status === "idle") return null;

  const statusConfig = {
    preparing: {
      icon: <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />,
      text: "Preparing your workflow...",
      color: "text-muted-foreground",
    },
    generating: {
      icon: <Sparkles className="h-4 w-4 text-primary animate-pulse" />,
      text: "Generating node structure...",
      color: "text-primary",
    },
    finalizing: {
      icon: <Network className="h-4 w-4 text-primary animate-pulse" />,
      text: "Finalizing connections...",
      color: "text-primary",
    },
    complete: {
      icon: <CheckCircle className="h-4 w-4 text-success" />,
      text: "Workflow generated successfully!",
      color: "text-success",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      text: "Error generating workflow",
      color: "text-destructive",
    },
  };

  const currentStatus = statusConfig[status];

  // Group partial nodes by type if available
  const nodesByType = partialNodes
    ? partialNodes.reduce<Record<string, Partial<Node>[]>>((acc, node) => {
        const type = node.data?.blockType || "UNKNOWN";
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(node);
        return acc;
      }, {})
    : {};

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentStatus.icon}
            <span className={cn("text-sm font-medium", currentStatus.color)}>
              {currentStatus.text}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {Math.round(progress)}%
          </span>
        </div>

        <Progress value={progress} className="h-1" />

        {status === "error" && error && (
          <div className="mt-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
            <p className="text-sm text-destructive font-medium">Error</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
            <div className="mt-2">
              <p className="text-xs">Suggestions:</p>
              <ul className="text-xs list-disc list-inside mt-1 text-muted-foreground">
                <li>Try simplifying your prompt</li>
                <li>Check for any special characters that might be causing issues</li>
                <li>Wait a moment and try again</li>
              </ul>
            </div>
          </div>
        )}

        {/* Show partial nodes being generated */}
        {status === "finalizing" && partialNodes && partialNodes.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-muted-foreground">
              Generated {partialNodes.length} nodes:
            </p>
            
            <div className="space-y-2">
              {Object.entries(nodesByType).map(([type, nodes]) => (
                <div key={type} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {nodes.length} node{nodes.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-1">
                    {nodes.slice(0, 5).map((node, index) => (
                      <Badge
                        key={`${type}-${index}`}
                        variant="secondary"
                        className="text-xs"
                      >
                        {node.data?.label || `Node ${index + 1}`}
                      </Badge>
                    ))}
                    {nodes.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{nodes.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete status */}
        {status === "complete" && partialNodes && partialNodes.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Created {partialNodes.length} nodes and {
                  // Estimate edge count as nodes - 1 if we have more than 1 node
                  partialNodes.length > 1 ? partialNodes.length - 1 : 0
                } connections
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Ready to use
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowGenerationStatus;
