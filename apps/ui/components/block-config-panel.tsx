"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Play,
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Sparkles,
  Shield,
  Activity,
} from "lucide-react";
import { blockConfigRegistry } from "@/lib/block-config-registry";
import { getBlockMetadata, getBlockType } from "@zyra/types";

import { ScrollArea } from "./ui/scroll-area";
import { getNodeSchema } from "./schema-aware-connection";

// Define NodeSchema interface locally
interface NodeSchema {
  input: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  output: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

// Define TypeScript interfaces for better type safety
interface WorkflowEdge {
  source: string;
  target: string;
}

interface WorkflowNode {
  id: string;
  data: Record<string, unknown>;
}

interface WorkflowData {
  workflowId?: string;
  selectedNodeId?: string;
  edges?: WorkflowEdge[];
  nodes?: WorkflowNode[];
}

interface ConnectedNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

interface BlockConfigPanelProps {
  node?: { id: string; data: Record<string, unknown> };
  nodeData?: Record<string, unknown>;
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
  connectedNodes?: ConnectedNode[];
  workflowData?: WorkflowData;
  onOpenDataTransform?: () => void;
  enableDataTransformation?: boolean;
  onConfigurationChange?: (config: Record<string, unknown>) => void;
}

export function BlockConfigPanel({
  node,
  nodeData,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
  workflowData = {},
}: BlockConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [nodeSchema, setNodeSchema] = useState<NodeSchema | null>(null);
  const [compatibilityIssues, setCompatibilityIssues] = useState<
    Array<{
      field: string;
      issue: string;
      severity: "error" | "warning" | "info";
      suggestion?: string;
      sourceNode?: string;
    }>
  >([]);

  // Memoize the data to prevent unnecessary re-renders
  const data = useMemo(
    () => nodeData || node?.data || {},
    [nodeData, node?.data]
  );

  // Memoize the onChange callback to prevent infinite loops
  const memoizedOnChange = useCallback(
    (config: Record<string, unknown>) => {
      const currentData = nodeData || node?.data || {};
      const updatedData = {
        ...currentData,
        config: config,
      };
      onChange(updatedData);
    },
    [onChange, nodeData, node?.data]
  );

  // Consolidate data source
  const blockType = getBlockType(data);
  const metadata = getBlockMetadata(blockType);

  // Get the appropriate config component based on block type
  const ConfigComponent =
    blockConfigRegistry.get(blockType) ||
    (() => (
      <Alert>
        <AlertDescription>
          No configuration component found for block type: {blockType}
        </AlertDescription>
      </Alert>
    ));

  // Compute input nodes
  const inputNodes = useMemo(() => {
    if (
      !workflowData?.edges ||
      !workflowData?.selectedNodeId ||
      !workflowData?.nodes
    ) {
      return [];
    }

    const inputEdges = workflowData.edges.filter(
      (edge) => edge.target === workflowData.selectedNodeId
    );
    const inputNodeIds = inputEdges.map((edge) => edge.source);
    return workflowData.nodes.filter((node) => inputNodeIds.includes(node.id));
  }, [workflowData?.edges, workflowData?.selectedNodeId, workflowData?.nodes]);

  // Set node schema
  useEffect(() => {
    const currentData = nodeData || node?.data || {};
    const schema = getNodeSchema(blockType, currentData.config || {});
    setNodeSchema(schema);
  }, [blockType, nodeData, node?.data]);

  // Check compatibility with connected nodes
  useEffect(() => {
    if (!nodeSchema || inputNodes.length === 0) {
      setCompatibilityIssues([]);
      return;
    }

    const issues: Array<{
      field: string;
      issue: string;
      severity: "error" | "warning" | "info";
      suggestion?: string;
      sourceNode?: string;
    }> = [];

    // Check each input node for compatibility
    for (const inputNode of inputNodes) {
      const inputSchema = extractSchemaDefinition(
        inputNode.data.outputSchema as Record<string, unknown>
      );
      if (!inputSchema) continue;

      // Compare input schema with current node's input requirements
      for (const requiredInput of nodeSchema.input) {
        const matchingField = (
          inputSchema.properties as Record<string, unknown>
        )?.[requiredInput.name];
        if (!matchingField && requiredInput.required) {
          issues.push({
            field: requiredInput.name,
            issue: `Missing required input field: ${requiredInput.name}`,
            severity: "error",
            suggestion: `Add ${requiredInput.name} to the output of ${inputNode.id}`,
            sourceNode: inputNode.id,
          });
        } else if (
          matchingField &&
          (matchingField as Record<string, unknown>).type !== requiredInput.type
        ) {
          issues.push({
            field: requiredInput.name,
            issue: `Type mismatch: expected ${requiredInput.type}, got ${(matchingField as Record<string, unknown>).type}`,
            severity: "warning",
            suggestion: `Transform ${requiredInput.name} from ${(matchingField as Record<string, unknown>).type} to ${requiredInput.type}`,
            sourceNode: inputNode.id,
          });
        }
      }
    }

    setCompatibilityIssues(issues);
  }, [nodeSchema, inputNodes]);

  // Simplified schema extraction
  const extractSchemaDefinition = (
    schema:
      | {
          type?: string;
          properties?: Record<string, unknown>;
          required?: string[];
          items?: unknown;
        }
      | undefined
  ): Record<string, unknown> | null => {
    if (!schema) return null;

    if (schema.type === "object" && schema.properties) {
      return {
        type: "object",
        properties: schema.properties,
        required: schema.required || [],
      };
    }

    if (schema.type === "array" && schema.items) {
      return {
        type: "array",
        items: extractSchemaDefinition(schema.items as typeof schema),
      };
    }

    if (schema.type) {
      return { type: schema.type };
    }

    return {};
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case "success":
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case "error":
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      case "warning":
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      case "running":
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />;
      default:
        return <Activity className='h-4 w-4 text-gray-400' />;
    }
  };

  const getStatusColor = () => {
    switch (executionStatus) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "running":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <div className='w-1/3 border-l border-border/50 bg-background/95 backdrop-blur-sm flex flex-col h-full max-h-screen'>
      {/* Modern Header */}
      <div className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 flex-shrink-0'>
        <div className='p-6 space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              {metadata?.icon && (
                <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center shadow-sm'>
                  <span className='text-lg font-semibold text-primary'>
                    {metadata.icon}
                  </span>
                </div>
              )}
              <div className='flex-1'>
                <h3 className='font-semibold text-lg text-foreground'>
                  {metadata?.label ?? blockType}
                </h3>
                <p className='text-sm text-muted-foreground mt-1'>
                  {metadata?.description ?? "Configure block settings"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {executionStatus !== "idle" && (
        <div className='px-6 py-3 border-b border-border/50'>
          <Alert className={`${getStatusColor()} border-l-4`}>
            <div className='flex items-center space-x-3'>
              {getStatusIcon()}
              <AlertDescription className='font-medium'>
                {executionStatus === "running" && "Processing..."}
                {executionStatus === "success" && "Completed successfully"}
                {executionStatus === "error" &&
                  `Error: ${executionData?.error || "Unknown error"}`}
                {executionStatus === "warning" && "Completed with warnings"}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      {/* Compatibility Issues */}
      {compatibilityIssues.length > 0 && (
        <div className='px-6 py-3 border-b border-border/50'>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              <div className='space-y-2'>
                <p className='font-medium'>Compatibility Issues Found</p>
                <div className='space-y-1'>
                  {compatibilityIssues.slice(0, 3).map((issue, index) => (
                    <p key={index} className='text-sm'>
                      • {issue.issue}
                    </p>
                  ))}
                  {compatibilityIssues.length > 3 && (
                    <p className='text-sm text-muted-foreground'>
                      +{compatibilityIssues.length - 3} more issues
                    </p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className='px-6 py-4 flex-1 flex flex-col min-h-0'>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full h-full flex flex-col'>
          <TabsList className='grid w-full grid-cols-3 h-12 bg-muted/50 rounded-lg p-1 mb-6'>
            <TabsTrigger
              value='config'
              className='flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md'>
              <Settings className='w-4 h-4' />
              <span className='hidden sm:inline'>Config</span>
            </TabsTrigger>
            <TabsTrigger
              value='schema'
              className='flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md'>
              <Zap className='w-4 h-4' />
              <span className='hidden sm:inline'>Schema</span>
            </TabsTrigger>
            <TabsTrigger
              value='test'
              className='flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md'>
              <Play className='w-4 h-4' />
              <span className='hidden sm:inline'>Test</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className='h-full'>
            <TabsContent value='config' className='space-y-6 pb-6'>
              <Card className='border-0 shadow-sm bg-card/50'>
                <CardContent className='p-6'>
                  <ConfigComponent
                    config={
                      (data.config as Record<string, unknown>) ?? {
                        __empty: true,
                      }
                    }
                    onChange={memoizedOnChange}
                    executionStatus={executionStatus}
                    executionData={executionData}
                    onTest={onTest}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='schema' className='space-y-6 pb-6'>
              <Card className='border-0 shadow-sm bg-card/50'>
                <CardContent className='p-6'>
                  <div className='space-y-6'>
                    <div className='flex items-center space-x-2'>
                      <Shield className='h-5 w-5 text-primary' />
                      <h4 className='font-semibold'>Input Schema</h4>
                    </div>
                    {nodeSchema?.input && nodeSchema.input.length > 0 ? (
                      <div className='space-y-3'>
                        {nodeSchema.input.map((input, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between p-3 bg-muted/30 rounded-lg'>
                            <div>
                              <p className='font-medium text-sm'>
                                {input.name}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {input.type}{" "}
                                {input.required ? "(required)" : "(optional)"}
                              </p>
                            </div>
                            {input.required && (
                              <span className='text-xs bg-red-100 text-red-700 px-2 py-1 rounded'>
                                Required
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-sm text-muted-foreground'>
                        No input schema defined
                      </p>
                    )}

                    <div className='flex items-center space-x-2 pt-4'>
                      <Sparkles className='h-5 w-5 text-primary' />
                      <h4 className='font-semibold'>Output Schema</h4>
                    </div>
                    {nodeSchema?.output && nodeSchema.output.length > 0 ? (
                      <div className='space-y-3'>
                        {nodeSchema.output.map((output, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between p-3 bg-muted/30 rounded-lg'>
                            <div>
                              <p className='font-medium text-sm'>
                                {output.name}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {output.type}{" "}
                                {output.required ? "(required)" : "(optional)"}
                              </p>
                            </div>
                            {output.required && (
                              <span className='text-xs bg-green-100 text-green-700 px-2 py-1 rounded'>
                                Required
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-sm text-muted-foreground'>
                        No output schema defined
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='test' className='space-y-6 pb-6'>
              <Card className='border-0 shadow-sm bg-card/50'>
                <CardContent className='p-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center space-x-2'>
                      <Play className='h-5 w-5 text-primary' />
                      <h4 className='font-semibold'>Test Configuration</h4>
                    </div>

                    <Alert>
                      <Info className='h-4 w-4' />
                      <AlertDescription>
                        Test your block configuration to ensure it works
                        correctly with sample data.
                      </AlertDescription>
                    </Alert>

                    {onTest && (
                      <Button
                        onClick={onTest}
                        disabled={executionStatus === "running"}
                        className='w-full h-11 bg-primary hover:bg-primary/90'>
                        {executionStatus === "running" ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className='mr-2 h-4 w-4' />
                            Test Block
                          </>
                        )}
                      </Button>
                    )}

                    {executionData && (
                      <div className='space-y-3'>
                        <h5 className='font-medium text-sm'>
                          Last Test Result
                        </h5>
                        <div className='p-4 bg-muted/30 rounded-lg space-y-2 text-sm'>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Status:
                            </span>
                            <span className='font-medium'>
                              {executionStatus}
                            </span>
                          </div>
                          {executionData.duration && (
                            <div className='flex justify-between'>
                              <span className='text-muted-foreground'>
                                Duration:
                              </span>
                              <span className='font-medium'>
                                {executionData.duration}ms
                              </span>
                            </div>
                          )}
                          {executionData.error && (
                            <div className='text-red-600 text-sm'>
                              <span className='font-medium'>Error:</span>{" "}
                              {executionData.error}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
