"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Activity,
  Network,
  Shield,
  Zap,
  GitBranch,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  ValidationResult,
  SecurityResult,
  GenerationMetrics,
  WorkflowNode,
} from "@/lib/api/enhanced-workflow-generation";

export interface EnhancedGenerationStatusProps {
  status: string;
  progress: number;
  error?: string;
  partialNodes?: WorkflowNode[];
  validationResult?: ValidationResult;
  securityResult?: SecurityResult;
  metrics?: GenerationMetrics;
  className?: string;
}

const StatusIcon = ({ status, className }: { status: string; className?: string }) => {
  switch (status.toLowerCase()) {
    case 'understanding requirements':
    case 'analyzing workflow':
    case 'initializing generation':
      return <Clock className={cn("h-4 w-4 animate-pulse", className)} />;
    case 'processing request':
    case 'designing workflow structure':
    case 'creating components':
      return <Sparkles className={cn("h-4 w-4 animate-pulse", className)} />;
    case 'security validation':
    case 'security validation complete':
      return <Shield className={cn("h-4 w-4", className)} />;
    case 'workflow validation':
    case 'workflow validation complete':
    case 'validating workflow':
    case 'validating refined workflow':
      return <AlertCircle className={cn("h-4 w-4", className)} />;
    case 'applying refinements':
    case 'auto-healing':
      return <Zap className={cn("h-4 w-4 animate-pulse", className)} />;
    case 'version created':
      return <GitBranch className={cn("h-4 w-4", className)} />;
    case 'finalizing':
    case 'generation metrics calculated':
    case 'refinement complete':
      return <Network className={cn("h-4 w-4 animate-pulse", className)} />;
    case 'complete':
      return <CheckCircle className={cn("h-4 w-4", className)} />;
    case 'error':
      return <AlertCircle className={cn("h-4 w-4", className)} />;
    default:
      return <Activity className={cn("h-4 w-4 animate-pulse", className)} />;
  }
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'complete':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    case 'security validation complete':
    case 'security validation':
      return 'text-blue-600';
    case 'workflow validation complete':
    case 'workflow validation':
    case 'validating workflow':
      return 'text-yellow-600';
    case 'version created':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
};

const ValidationSummary = ({ validationResult }: { validationResult: ValidationResult }) => (
  <Alert className={cn(
    "mt-3",
    validationResult.isValid ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
  )}>
    <AlertCircle className={cn(
      "h-4 w-4",
      validationResult.isValid ? "text-green-600" : "text-yellow-600"
    )} />
    <AlertDescription className={cn(
      validationResult.isValid ? "text-green-800" : "text-yellow-800"
    )}>
      <div className="flex items-center justify-between">
        <span>
          {validationResult.isValid ? "Validation passed" : "Validation issues found"}
          {validationResult.correctedWorkflow && " (auto-corrected)"}
        </span>
        <div className="flex space-x-2">
          {validationResult.errors.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {validationResult.errors.length} errors
            </Badge>
          )}
          {validationResult.warnings.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {validationResult.warnings.length} warnings
            </Badge>
          )}
        </div>
      </div>
    </AlertDescription>
  </Alert>
);

const SecuritySummary = ({ securityResult }: { securityResult: SecurityResult }) => (
  <Alert className={cn(
    "mt-3",
    securityResult.isSecure ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
  )}>
    <Shield className={cn(
      "h-4 w-4",
      securityResult.isSecure ? "text-green-600" : "text-red-600"
    )} />
    <AlertDescription className={cn(
      securityResult.isSecure ? "text-green-800" : "text-red-800"
    )}>
      <div className="flex items-center justify-between">
        <span>
          {securityResult.isSecure ? "Security validation passed" : "Security issues detected"}
        </span>
        {securityResult.issues.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {securityResult.issues.length} issues
          </Badge>
        )}
      </div>
    </AlertDescription>
  </Alert>
);

const MetricsSummary = ({ metrics }: { metrics: GenerationMetrics }) => (
  <div className="mt-3 p-3 bg-gray-50 rounded-md border">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-700">Generation Metrics</span>
      <Zap className="h-4 w-4 text-gray-500" />
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
      <div className="flex justify-between">
        <span>Processing Time:</span>
        <span className="font-medium">{metrics.processingTime}ms</span>
      </div>
      <div className="flex justify-between">
        <span>Auto-corrections:</span>
        <span className="font-medium">{metrics.autoCorrections}</span>
      </div>
      <div className="flex justify-between">
        <span>Validation Errors:</span>
        <span className="font-medium text-red-600">{metrics.validationErrors}</span>
      </div>
      <div className="flex justify-between">
        <span>Warnings:</span>
        <span className="font-medium text-yellow-600">{metrics.validationWarnings}</span>
      </div>
      {metrics.securityIssues !== undefined && (
        <div className="flex justify-between col-span-2">
          <span>Security Issues:</span>
          <span className="font-medium text-orange-600">{metrics.securityIssues}</span>
        </div>
      )}
    </div>
  </div>
);

const NodesSummary = ({ nodes }: { nodes: WorkflowNode[] }) => {
  const nodesByType = nodes.reduce<Record<string, WorkflowNode[]>>((acc, node) => {
    const type = (node.data as any)?.blockType || "UNKNOWN";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(node);
    return acc;
  }, {});

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-blue-50 rounded hover:bg-blue-100 mt-3">
        <span className="text-sm font-medium text-blue-800">
          Generated Nodes ({nodes.length})
        </span>
        <Info className="h-4 w-4 text-blue-600" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {Object.entries(nodesByType).map(([type, typeNodes]) => (
          <div key={type} className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {type.replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-gray-600">
                {typeNodes.length} node{typeNodes.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 ml-1">
              {typeNodes.slice(0, 5).map((node, index) => (
                <Badge
                  key={`${type}-${index}`}
                  variant="secondary"
                  className="text-xs"
                >
                  {(node.data as any)?.label || `Node ${index + 1}`}
                </Badge>
              ))}
              {typeNodes.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{typeNodes.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const EnhancedGenerationStatus: React.FC<EnhancedGenerationStatusProps> = ({
  status,
  progress,
  error,
  partialNodes,
  validationResult,
  securityResult,
  metrics,
  className,
}) => {
  if (status === "idle") return null;

  const isComplete = status.toLowerCase() === "complete";
  const isError = status.toLowerCase().includes("error");
  const statusColor = getStatusColor(status);

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon status={status} className={statusColor} />
            <span className={cn("text-sm font-medium", statusColor)}>
              {status}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-mono">
              {Math.round(progress)}%
            </span>
            {isComplete && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Success
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={progress} 
          className={cn(
            "h-2",
            isComplete && "bg-green-100"
          )}
        />

        {/* Error Display */}
        {isError && error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <p className="font-medium">Generation Failed</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="mt-3">
                <p className="text-sm font-medium">Suggestions:</p>
                <ul className="text-sm list-disc list-inside mt-1 text-red-700">
                  <li>Try simplifying your prompt or being more specific</li>
                  <li>Check for any unusual characters or formatting</li>
                  <li>Ensure your request follows security guidelines</li>
                  <li>Wait a moment and try again</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Results */}
        {validationResult && <ValidationSummary validationResult={validationResult} />}

        {/* Security Results */}
        {securityResult && <SecuritySummary securityResult={securityResult} />}

        {/* Generation Metrics */}
        {metrics && <MetricsSummary metrics={metrics} />}

        {/* Generated Nodes Summary */}
        {partialNodes && partialNodes.length > 0 && (
          <NodesSummary nodes={partialNodes} />
        )}

        {/* Complete Status Additional Info */}
        {isComplete && partialNodes && partialNodes.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600">
                Created {partialNodes.length} nodes
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-600">
                Ready to use
              </span>
            </div>
          </div>
        )}

        {/* Auto-corrections Notice */}
        {validationResult?.correctedWorkflow && (
          <Alert className="border-blue-200 bg-blue-50">
            <Zap className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <span className="font-medium">Auto-improvements applied:</span>
              <span className="ml-1">Your workflow was automatically optimized for better performance and reliability.</span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedGenerationStatus;