"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node } from "@/components/flow-canvas";

interface WorkflowGenerationStatusProps {
  status: "preparing" | "generating" | "finalizing" | "complete" | "error";
  progress: number;
  partialNodes?: Partial<Node>[];
  message?: string;
  error?: string;
  className?: string;
}

export const WorkflowGenerationStatus: React.FC<WorkflowGenerationStatusProps> = ({
  status,
  progress,
  partialNodes = [],
  message,
  error,
  className,
}) => {
  // Status messages for each stage
  const statusMessages = {
    preparing: "Analyzing your request...",
    generating: "Designing your workflow...",
    finalizing: "Finalizing components...",
    complete: "Workflow generated successfully!",
    error: error || "An error occurred during generation.",
  };

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {status === "error" ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : status === "complete" ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            <span className="font-medium">
              {message || statusMessages[status]}
            </span>
          </div>
          
          {status !== "error" && status !== "complete" && (
            <Badge variant="outline" className="text-xs">
              {Math.round(progress)}%
            </Badge>
          )}
        </div>

        {status !== "error" && status !== "complete" && (
          <Progress value={progress} className="h-2" />
        )}

        {partialNodes.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Components being created:</p>
            <div className="space-y-2">
              {partialNodes.map((node, index) => (
                <div
                  key={node.id || index}
                  className="text-xs border rounded-md p-2 bg-background"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {node.data?.label || `Component ${index + 1}`}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {node.data?.blockType || "Processing..."}
                    </Badge>
                  </div>
                  {node.data?.description && (
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {node.data.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "error" && error && (
          <div className="mt-2 text-sm text-destructive">
            <p className="font-medium">Error details:</p>
            <p className="mt-1">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
