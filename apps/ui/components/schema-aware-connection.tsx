"use client";

import React, { useEffect, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  Zap,
  Database,
  Eye,
  Settings,
} from "lucide-react";

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

interface CompatibilityCheck {
  compatible: boolean;
  issues: Array<{
    field: string;
    issue: string;
    severity: "error" | "warning" | "info";
    suggestion?: string;
  }>;
  transformationRequired: boolean;
}

interface SchemaAwareNodeProps extends NodeProps {
  nodeType: string;
  config: any;
  schema?: NodeSchema;
  connectedNodes?: Array<{
    nodeId: string;
    schema: NodeSchema;
  }>;
  onConfigChange?: (config: any) => void;
  onOpenConfig?: () => void;
}

export function SchemaAwareNode({
  id,
  data,
  nodeType,
  config,
  schema,
  connectedNodes = [],
  onConfigChange,
  onOpenConfig,
}: SchemaAwareNodeProps) {
  const [compatibilityStatus, setCompatibilityStatus] =
    useState<CompatibilityCheck | null>(null);
  const [showSchemaPreview, setShowSchemaPreview] = useState(false);

  // Check compatibility with connected nodes
  useEffect(() => {
    if (schema && connectedNodes.length > 0) {
      const compatibility = checkSchemaCompatibility(schema, connectedNodes);
      setCompatibilityStatus(compatibility);
    } else {
      setCompatibilityStatus(null);
    }
  }, [schema, connectedNodes, config]);

  // Check schema compatibility between connected nodes
  const checkSchemaCompatibility = (
    currentSchema: NodeSchema,
    connectedNodes: Array<{ nodeId: string; schema: NodeSchema }>
  ): CompatibilityCheck => {
    const issues: CompatibilityCheck["issues"] = [];
    let transformationRequired = false;

    for (const connectedNode of connectedNodes) {
      // Check if output fields from connected node match input requirements
      for (const requiredInput of currentSchema.input) {
        const matchingOutput = connectedNode.schema.output.find(
          (output) => output.name === requiredInput.name
        );

        if (!matchingOutput) {
          if (requiredInput.required) {
            issues.push({
              field: requiredInput.name,
              issue: `Required field '${requiredInput.name}' not provided by connected node`,
              severity: "error",
              suggestion: `Add a data transformation block or modify the source node to provide '${requiredInput.name}'`,
            });
          } else {
            issues.push({
              field: requiredInput.name,
              issue: `Optional field '${requiredInput.name}' not available`,
              severity: "info",
            });
          }
        } else if (
          matchingOutput.type !== requiredInput.type &&
          requiredInput.type !== "any"
        ) {
          issues.push({
            field: requiredInput.name,
            issue: `Type mismatch: expected ${requiredInput.type}, got ${matchingOutput.type}`,
            severity: "warning",
            suggestion: `Add a format transformation to convert ${matchingOutput.type} to ${requiredInput.type}`,
          });
          transformationRequired = true;
        }
      }
    }

    return {
      compatible:
        issues.filter((issue) => issue.severity === "error").length === 0,
      issues,
      transformationRequired,
    };
  };

  // Get node color based on compatibility status
  const getNodeColor = () => {
    if (!compatibilityStatus) return "border-gray-300 bg-white";

    if (!compatibilityStatus.compatible) return "border-red-300 bg-red-50";
    if (compatibilityStatus.transformationRequired)
      return "border-yellow-300 bg-yellow-50";
    return "border-green-300 bg-green-50";
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!compatibilityStatus) return null;

    if (!compatibilityStatus.compatible) {
      return <AlertCircle className='w-4 h-4 text-red-500' />;
    }
    if (compatibilityStatus.transformationRequired) {
      return <AlertTriangle className='w-4 h-4 text-yellow-500' />;
    }
    return <CheckCircle className='w-4 h-4 text-green-500' />;
  };

  return (
    <TooltipProvider>
      <Card className={`w-64 shadow-md transition-all ${getNodeColor()}`}>
        {/* Input Handles */}
        {schema?.input.map((field, index) => (
          <Tooltip key={`input-${field.name}`}>
            <TooltipTrigger asChild>
              <Handle
                type='target'
                position={Position.Left}
                id={`input-${field.name}`}
                style={{
                  top: 60 + index * 20,
                  background: field.required ? "#ef4444" : "#6b7280",
                  width: 8,
                  height: 8,
                }}
                className='transition-all hover:scale-125'
              />
            </TooltipTrigger>
            <TooltipContent side='left'>
              <div className='text-xs'>
                <div className='font-medium'>{field.name}</div>
                <div className='text-gray-500'>{field.type}</div>
                {field.required && <div className='text-red-500'>Required</div>}
                {field.description && (
                  <div className='mt-1'>{field.description}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        <CardContent className='p-4'>
          {/* Header */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center space-x-2'>
              <div className='flex items-center space-x-1'>
                {getStatusIcon()}
                <span className='font-medium text-sm'>
                  {data.label || nodeType}
                </span>
              </div>
            </div>
            <div className='flex space-x-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-6 w-6 p-0'
                    onClick={() => setShowSchemaPreview(!showSchemaPreview)}>
                    <Eye className='w-3 h-3' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Schema</p>
                </TooltipContent>
              </Tooltip>

              {onOpenConfig && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 w-6 p-0'
                      onClick={onOpenConfig}>
                      <Settings className='w-3 h-3' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Configure</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Compatibility Issues */}
          {compatibilityStatus && compatibilityStatus.issues.length > 0 && (
            <div className='mb-3'>
              {compatibilityStatus.issues.slice(0, 2).map((issue, index) => (
                <Alert
                  key={index}
                  variant={
                    issue.severity === "error" ? "destructive" : "default"
                  }
                  className='py-1 px-2 mb-1'>
                  <AlertDescription className='text-xs'>
                    {issue.issue}
                  </AlertDescription>
                </Alert>
              ))}
              {compatibilityStatus.issues.length > 2 && (
                <div className='text-xs text-gray-500'>
                  +{compatibilityStatus.issues.length - 2} more issues
                </div>
              )}
            </div>
          )}

          {/* Schema Preview */}
          {showSchemaPreview && schema && (
            <div className='border rounded p-2 mb-3 bg-gray-50'>
              <div className='text-xs'>
                <div className='font-medium mb-1'>Input Schema:</div>
                <div className='space-y-1 mb-2'>
                  {schema.input.map((field) => (
                    <div
                      key={field.name}
                      className='flex items-center justify-between'>
                      <span className='text-gray-700'>{field.name}</span>
                      <div className='flex items-center space-x-1'>
                        <Badge variant='outline' className='text-xs py-0 px-1'>
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge
                            variant='destructive'
                            className='text-xs py-0 px-1'>
                            req
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className='font-medium mb-1'>Output Schema:</div>
                <div className='space-y-1'>
                  {schema.output.map((field) => (
                    <div
                      key={field.name}
                      className='flex items-center justify-between'>
                      <span className='text-gray-700'>{field.name}</span>
                      <Badge variant='outline' className='text-xs py-0 px-1'>
                        {field.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Node Status */}
          <div className='flex items-center justify-between text-xs'>
            <div className='flex items-center space-x-2'>
              {compatibilityStatus?.transformationRequired && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className='flex items-center space-x-1 text-yellow-600'>
                      <Zap className='w-3 h-3' />
                      <span>Transform needed</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Data transformation required for compatibility</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {schema && (
                <div className='flex items-center space-x-1 text-gray-500'>
                  <Database className='w-3 h-3' />
                  <span>
                    {schema.input.length}→{schema.output.length}
                  </span>
                </div>
              )}
            </div>

            {compatibilityStatus && (
              <Badge
                variant={
                  compatibilityStatus.compatible ? "default" : "destructive"
                }
                className='text-xs'>
                {compatibilityStatus.compatible ? "Compatible" : "Issues"}
              </Badge>
            )}
          </div>
        </CardContent>

        {/* Output Handles */}
        {schema?.output.map((field, index) => (
          <Tooltip key={`output-${field.name}`}>
            <TooltipTrigger asChild>
              <Handle
                type='source'
                position={Position.Right}
                id={`output-${field.name}`}
                style={{
                  top: 60 + index * 20,
                  background: "#3b82f6",
                  width: 8,
                  height: 8,
                }}
                className='transition-all hover:scale-125'
              />
            </TooltipTrigger>
            <TooltipContent side='right'>
              <div className='text-xs'>
                <div className='font-medium'>{field.name}</div>
                <div className='text-gray-500'>{field.type}</div>
                {field.description && (
                  <div className='mt-1'>{field.description}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </Card>
    </TooltipProvider>
  );
}

// Enhanced edge component that shows data flow information
interface SchemaAwareEdgeProps {
  id: string;
  sourceNode: any;
  targetNode: any;
  sourceSchema?: NodeSchema;
  targetSchema?: NodeSchema;
  isAnimated?: boolean;
  data?: any;
}

export function SchemaAwareEdge({
  sourceSchema,
  targetSchema,
  isAnimated,
  data,
}: SchemaAwareEdgeProps) {
  const [compatibility, setCompatibility] = useState<CompatibilityCheck | null>(
    null
  );

  useEffect(() => {
    if (sourceSchema && targetSchema) {
      // Check field compatibility between source output and target input
      const issues: CompatibilityCheck["issues"] = [];
      let transformationRequired = false;

      for (const targetInput of targetSchema.input) {
        const sourceOutput = sourceSchema.output.find(
          (output) => output.name === targetInput.name
        );

        if (!sourceOutput && targetInput.required) {
          issues.push({
            field: targetInput.name,
            issue: `Required field missing`,
            severity: "error",
          });
        } else if (
          sourceOutput &&
          sourceOutput.type !== targetInput.type &&
          targetInput.type !== "any"
        ) {
          issues.push({
            field: targetInput.name,
            issue: `Type mismatch: ${sourceOutput.type} → ${targetInput.type}`,
            severity: "warning",
          });
          transformationRequired = true;
        }
      }

      setCompatibility({
        compatible:
          issues.filter((issue) => issue.severity === "error").length === 0,
        issues,
        transformationRequired,
      });
    }
  }, [sourceSchema, targetSchema]);

  // This would be used in a custom edge component for ReactFlow
  return null;
}

// Utility function to get schema for different node types
export const getNodeSchema = (nodeType: string, config: any): NodeSchema => {
  switch (nodeType) {
    case "HTTP_REQUEST":
      return {
        input: [
          {
            name: "url",
            type: "string",
            required: false,
            description: "Request URL (can be configured)",
          },
          {
            name: "headers",
            type: "object",
            required: false,
            description: "Additional headers",
          },
          {
            name: "body",
            type: "any",
            required: false,
            description: "Request body data",
          },
        ],
        output: [
          {
            name: "statusCode",
            type: "number",
            required: true,
            description: "HTTP status code",
          },
          {
            name: "data",
            type: "any",
            required: true,
            description: "Response data",
          },
          {
            name: "headers",
            type: "object",
            required: true,
            description: "Response headers",
          },
          {
            name: "success",
            type: "boolean",
            required: true,
            description: "Request success status",
          },
        ],
      };

    case "EMAIL":
      return {
        input: [
          {
            name: "to",
            type: "string",
            required: false,
            description: "Recipient email (can be configured)",
          },
          {
            name: "subject",
            type: "string",
            required: false,
            description: "Email subject (can be configured)",
          },
          {
            name: "body",
            type: "string",
            required: false,
            description: "Email body (can be configured)",
          },
          {
            name: "data",
            type: "any",
            required: false,
            description: "Template data",
          },
        ],
        output: [
          {
            name: "success",
            type: "boolean",
            required: true,
            description: "Email sent successfully",
          },
          {
            name: "messageId",
            type: "string",
            required: false,
            description: "Email message ID",
          },
          {
            name: "timestamp",
            type: "string",
            required: true,
            description: "Send timestamp",
          },
        ],
      };

    case "DATA_TRANSFORM":
      return {
        input: [
          {
            name: "data",
            type: "any",
            required: true,
            description: "Data to transform",
          },
        ],
        output: [
          {
            name: "transformedData",
            type: "any",
            required: true,
            description: "Transformed data",
          },
          {
            name: "metadata",
            type: "object",
            required: true,
            description: "Transformation metadata",
          },
        ],
      };

    case "CONDITION":
      return {
        input: [
          {
            name: "data",
            type: "any",
            required: true,
            description: "Data to evaluate",
          },
        ],
        output: [
          {
            name: "result",
            type: "boolean",
            required: true,
            description: "Condition result",
          },
          {
            name: "data",
            type: "any",
            required: false,
            description: "Passed-through data",
          },
        ],
      };

    case "PRICE_MONITOR":
      return {
        input: [
          {
            name: "asset",
            type: "string",
            required: false,
            description: "Asset symbol (can be configured)",
          },
        ],
        output: [
          {
            name: "asset",
            type: "string",
            required: true,
            description: "Asset symbol",
          },
          {
            name: "currentPrice",
            type: "number",
            required: true,
            description: "Current price",
          },
          {
            name: "triggered",
            type: "boolean",
            required: true,
            description: "Condition triggered",
          },
          {
            name: "timestamp",
            type: "string",
            required: true,
            description: "Price timestamp",
          },
        ],
      };

    default:
      return {
        input: [
          {
            name: "data",
            type: "any",
            required: false,
            description: "Input data",
          },
        ],
        output: [
          {
            name: "result",
            type: "any",
            required: true,
            description: "Output result",
          },
        ],
      };
  }
};
