"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Settings,
  Eye,
  Zap,
  Database,
  Activity,
  Clock,
  XCircle,
} from "lucide-react";
import { getNodeSchema, type NodeSchema } from "./schema-aware-connection";
import { BlockType } from "@zyra/types";

interface EnhancedNodeData {
  label: string;
  type: BlockType;
  config: Record<string, any>;
  category: string;
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed' | 'warning';
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    output?: any;
  };
  validationErrors?: string[];
  isConfigured?: boolean;
}

interface CompatibilityIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

interface EnhancedWorkflowNodeProps extends NodeProps<EnhancedNodeData> {
  onOpenConfig?: (nodeId: string) => void;
  onViewOutput?: (nodeId: string) => void;
  connectedInputNodes?: Array<{
    nodeId: string;
    schema: NodeSchema;
  }>;
  connectedOutputNodes?: Array<{
    nodeId: string;
    schema: NodeSchema;
  }>;
}

export const EnhancedWorkflowNode = memo<EnhancedWorkflowNodeProps>(({
  id,
  data,
  selected,
  onOpenConfig,
  onViewOutput,
  connectedInputNodes = [],
  connectedOutputNodes = []
}) => {
  const [schema, setSchema] = useState<NodeSchema | null>(null);
  const [compatibilityIssues, setCompatibilityIssues] = useState<CompatibilityIssue[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get schema for this node type
  useEffect(() => {
    const nodeSchema = getNodeSchema(data.type, data.config);
    setSchema(nodeSchema);
  }, [data.type, data.config]);

  // Check compatibility with connected nodes
  useEffect(() => {
    if (!schema || connectedInputNodes.length === 0) {
      setCompatibilityIssues([]);
      return;
    }

    const issues: CompatibilityIssue[] = [];

    // Check input compatibility
    for (const requiredInput of schema.input) {
      let fieldProvided = false;
      
      for (const inputNode of connectedInputNodes) {
        const matchingOutput = inputNode.schema.output.find(
          output => output.name === requiredInput.name
        );

        if (matchingOutput) {
          fieldProvided = true;
          // Check type compatibility
          if (matchingOutput.type !== requiredInput.type && requiredInput.type !== 'any') {
            issues.push({
              field: requiredInput.name,
              issue: `Type mismatch: expected ${requiredInput.type}, got ${matchingOutput.type}`,
              severity: 'warning',
              suggestion: `Add a data transformation to convert ${matchingOutput.type} to ${requiredInput.type}`
            });
          }
          break;
        }
      }

      if (!fieldProvided && requiredInput.required) {
        issues.push({
          field: requiredInput.name,
          issue: `Required field '${requiredInput.name}' not provided`,
          severity: 'error',
          suggestion: `Connect a node that provides '${requiredInput.name}' or make this field optional`
        });
      }
    }

    setCompatibilityIssues(issues);
  }, [schema, connectedInputNodes]);

  // Get node appearance based on status and compatibility
  const getNodeAppearance = useCallback(() => {
    const hasErrors = compatibilityIssues.some(issue => issue.severity === 'error');
    const hasWarnings = compatibilityIssues.some(issue => issue.severity === 'warning');
    
    if (data.executionStatus === 'failed' || hasErrors) {
      return {
        borderColor: 'border-red-400',
        backgroundColor: 'bg-red-50',
        statusColor: 'text-red-600'
      };
    }
    
    if (data.executionStatus === 'running') {
      return {
        borderColor: 'border-blue-400',
        backgroundColor: 'bg-blue-50',
        statusColor: 'text-blue-600'
      };
    }
    
    if (data.executionStatus === 'completed') {
      return {
        borderColor: 'border-green-400',
        backgroundColor: 'bg-green-50',
        statusColor: 'text-green-600'
      };
    }
    
    if (hasWarnings || data.executionStatus === 'warning') {
      return {
        borderColor: 'border-yellow-400',
        backgroundColor: 'bg-yellow-50',
        statusColor: 'text-yellow-600'
      };
    }

    if (!data.isConfigured) {
      return {
        borderColor: 'border-gray-400',
        backgroundColor: 'bg-gray-50',
        statusColor: 'text-gray-600'
      };
    }
    
    return {
      borderColor: 'border-gray-300',
      backgroundColor: 'bg-white',
      statusColor: 'text-gray-700'
    };
  }, [data.executionStatus, data.isConfigured, compatibilityIssues]);

  // Get status icon
  const getStatusIcon = useCallback(() => {
    switch (data.executionStatus) {
      case 'running':
        return <Activity className="w-4 h-4 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  }, [data.executionStatus]);

  const appearance = getNodeAppearance();
  const statusIcon = getStatusIcon();

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Input Handles */}
        {schema?.input.map((field, index) => (
          <Tooltip key={`input-${field.name}`}>
            <TooltipTrigger asChild>
              <Handle
                type="target"
                position={Position.Left}
                id={`input-${field.name}`}
                style={{
                  top: 60 + index * 15,
                  background: field.required ? '#ef4444' : '#6b7280',
                  width: 10,
                  height: 10,
                  border: '2px solid white',
                }}
                className="transition-all hover:scale-125"
              />
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="text-xs">
                <div className="font-medium">{field.name}</div>
                <div className="text-gray-500 capitalize">{field.type}</div>
                {field.required && <div className="text-red-500">Required</div>}
                {field.description && <div className="mt-1">{field.description}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        <Card className={`
          w-72 shadow-lg transition-all duration-200
          ${appearance.borderColor} ${appearance.backgroundColor}
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          hover:shadow-xl
        `}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {statusIcon}
                <div className="flex flex-col">
                  <span className="font-semibold text-sm truncate max-w-32">
                    {data.label}
                  </span>
                  <Badge variant="outline" className="text-xs w-fit">
                    {data.type}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {onViewOutput && data.executionData?.output && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onViewOutput(id)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Output</TooltipContent>
                  </Tooltip>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onOpenConfig?.(id)}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Configure</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Compatibility Issues */}
            {compatibilityIssues.length > 0 && (
              <div className="mb-3">
                {compatibilityIssues.slice(0, 2).map((issue, index) => (
                  <Alert 
                    key={index} 
                    variant={issue.severity === 'error' ? 'destructive' : 'default'} 
                    className="py-2 px-3 mb-2 text-xs"
                  >
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription>
                      <div className="font-medium">{issue.field}</div>
                      <div>{issue.issue}</div>
                      {issue.suggestion && (
                        <div className="text-gray-600 mt-1">{issue.suggestion}</div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
                
                {compatibilityIssues.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{compatibilityIssues.length - 2} more compatibility issues
                  </div>
                )}
              </div>
            )}

            {/* Configuration Status */}
            {!data.isConfigured && (
              <Alert className="mb-3 py-2 px-3">
                <Settings className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Node needs configuration
                </AlertDescription>
              </Alert>
            )}

            {/* Execution Info */}
            {data.executionData && (
              <div className="mb-3 p-2 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between text-xs">
                  {data.executionData.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{data.executionData.duration}ms</span>
                    </div>
                  )}
                  
                  {data.executionData.error && (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center space-x-1 text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Error</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{data.executionData.error}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}

            {/* Schema Info */}
            {schema && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Database className="w-3 h-3" />
                    <span>{schema.input.length}→{schema.output.length}</span>
                  </div>
                  
                  {compatibilityIssues.some(issue => issue.severity === 'warning') && (
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <Zap className="w-3 h-3" />
                      <span>Transform needed</span>
                    </div>
                  )}
                </div>
                
                <Badge 
                  variant={compatibilityIssues.some(issue => issue.severity === 'error') ? "destructive" : "default"} 
                  className="text-xs py-0 px-1"
                >
                  {compatibilityIssues.length === 0 ? "Valid" : 
                   compatibilityIssues.some(issue => issue.severity === 'error') ? "Error" : "Warning"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output Handles */}
        {schema?.output.map((field, index) => (
          <Tooltip key={`output-${field.name}`}>
            <TooltipTrigger asChild>
              <Handle
                type="source"
                position={Position.Right}
                id={`output-${field.name}`}
                style={{
                  top: 60 + index * 15,
                  background: '#3b82f6',
                  width: 10,
                  height: 10,
                  border: '2px solid white',
                }}
                className="transition-all hover:scale-125"
              />
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="text-xs">
                <div className="font-medium">{field.name}</div>
                <div className="text-gray-500 capitalize">{field.type}</div>
                {field.description && <div className="mt-1">{field.description}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
});

EnhancedWorkflowNode.displayName = "EnhancedWorkflowNode";