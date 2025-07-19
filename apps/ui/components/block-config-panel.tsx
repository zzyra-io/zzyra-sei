"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Play,
  ArrowRight,
  Eye,
  EyeOff,
  Link,
  Unlink,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";
import { blockConfigRegistry } from "@/lib/block-config-registry";
import { getBlockMetadata, getBlockType } from "@zyra/types";
import { getEnhancedBlockSchema } from "@zyra/types";
import { executionsApi } from "@/lib/services/api";

interface ConnectedNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

interface BlockConfigPanelProps {
  node?: Record<string, any>;
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
  // New props for connection visualization
  connectedNodes?: ConnectedNode[];
  workflowData?: Record<string, unknown>;
}

export function BlockConfigPanel({
  node,
  nodeData,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
  connectedNodes = [],
  workflowData = {},
}: BlockConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [showInputSchema, setShowInputSchema] = useState(true);
  const [showOutputSchema, setShowOutputSchema] = useState(false);
  const [sampleData, setSampleData] = useState<Record<string, any>>({});

  // Prefer node.data, fallback to nodeData, fallback to empty object
  const data = node && node.data ? node.data : nodeData || {};
  const blockType = getBlockType(data);
  const metadata = getBlockMetadata(blockType);
  const enhancedSchema = getEnhancedBlockSchema(blockType);

  // Debug logging to understand the data structure
  console.log("BlockConfigPanel debug:", {
    node,
    nodeData,
    data,
    blockType,
    hasMetadata: !!metadata,
    hasEnhancedSchema: !!enhancedSchema,
    dataKeys: Object.keys(data),
    dataBlockType: data?.blockType,
    dataType: data?.type,
    dataId: data?.id,
    nodeType: data?.nodeType,
  });

  // Get connected input nodes (nodes that connect TO this node)
  const inputNodes = useMemo(() => {
    if (!workflowData?.edges || !workflowData?.selectedNodeId) return [];

    const edges = workflowData.edges as any[];
    const selectedNodeId = workflowData.selectedNodeId as string;
    const nodes = workflowData.nodes as any[];

    console.log("Connection detection debug:", {
      edges: edges.length,
      selectedNodeId,
      nodes: nodes.length,
      nodeIds: nodes.map((n) => n.id),
    });

    // Find edges where this node is the target
    const inputEdges = edges.filter(
      (edge: any) => edge.target === selectedNodeId
    );
    console.log("Input edges:", inputEdges);

    // Get the source nodes for these edges
    const inputNodeIds = inputEdges.map((edge: any) => edge.source);
    console.log("Input node IDs:", inputNodeIds);

    const inputNodes = nodes.filter((node: any) =>
      inputNodeIds.includes(node.id)
    );
    console.log("Input nodes found:", inputNodes.length);

    return inputNodes;
  }, [workflowData]);

  // Check if we have valid data to work with (after all hooks)
  if (!node && !nodeData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Block Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className='h-4 w-4' />
            <AlertDescription>
              No block selected. Please select a block to configure it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check if we have data but couldn't determine the block type
  if (blockType === "UNKNOWN" && (node || nodeData)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Block Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              Unable to determine block type. Data structure:{" "}
              {JSON.stringify(data, null, 2)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Fetch sample data for connected nodes
  useEffect(() => {
    const fetchSampleData = async () => {
      const newSampleData: Record<string, any> = {};

      for (const node of inputNodes) {
        try {
          const data = await getSampleData(node.id);
          if (data) {
            newSampleData[node.id] = data;
          }
        } catch (error) {
          console.warn(
            `Failed to fetch sample data for node ${node.id}:`,
            error
          );
        }
      }

      setSampleData(newSampleData);
    };

    if (inputNodes.length > 0) {
      fetchSampleData();
    }
  }, [inputNodes, workflowData]);

  // Extract schema definition helper function
  const extractSchemaDefinition = (schema: any) => {
    if (!schema) return null;

    // Handle JSON Schema format (what the API returns)
    if (schema.type === "object" && schema.properties) {
      return {
        type: "object",
        properties: schema.properties,
        required: schema.required || [],
      };
    }

    // Handle arrays
    if (schema.type === "array" && schema.items) {
      return {
        type: "array",
        items: extractSchemaDefinition(schema.items),
      };
    }

    // Handle primitive types
    if (schema.type && !schema.properties) {
      return { type: schema.type };
    }

    // Fallback for Zod schemas (if any still exist)
    if (schema.shape) {
      const shape = schema.shape;
      const result: Record<string, any> = {};

      Object.keys(shape).forEach((key) => {
        const field = shape[key];
        if (field._def) {
          const def = field._def;
          if (def.typeName === "ZodString") {
            result[key] = { type: "string" };
          } else if (def.typeName === "ZodNumber") {
            result[key] = { type: "number" };
          } else if (def.typeName === "ZodBoolean") {
            result[key] = { type: "boolean" };
          } else if (def.typeName === "ZodObject") {
            result[key] = {
              type: "object",
              properties: extractSchemaDefinition(field),
            };
          } else if (def.typeName === "ZodArray") {
            result[key] = {
              type: "array",
              items: extractSchemaDefinition(def.innerType),
            };
          } else {
            result[key] = { type: "unknown" };
          }
        } else {
          result[key] = { type: "unknown" };
        }
      });

      return result;
    }

    return schema;
  };

  // Get connected output nodes (nodes that this node connects TO)
  const outputNodes = useMemo(() => {
    if (!workflowData?.edges || !workflowData?.selectedNodeId) return [];

    const edges = workflowData.edges as any[];
    const selectedNodeId = workflowData.selectedNodeId as string;
    const nodes = workflowData.nodes as any[];

    // Find edges where this node is the source
    const outputEdges = edges.filter(
      (edge: any) => edge.source === selectedNodeId
    );

    // Get the target nodes for these edges
    const outputNodeIds = outputEdges.map((edge: any) => edge.target);

    return nodes.filter((node: any) => outputNodeIds.includes(node.id));
  }, [workflowData]);

  // Generate input schema from connected nodes
  const detectedInputSchema = useMemo(() => {
    if (inputNodes.length === 0) {
      console.log("No input nodes detected");
      return null;
    }

    console.log("Processing input nodes:", inputNodes.length);

    const schemas = inputNodes.map((node) => {
      const nodeBlockType = getBlockType(node.data || node);
      const nodeSchema = getEnhancedBlockSchema(nodeBlockType);
      console.log("Node schema:", {
        nodeId: node.id,
        nodeBlockType,
        hasSchema: !!nodeSchema,
      });

      return {
        nodeId: node.id,
        nodeType: nodeBlockType,
        outputSchema: nodeSchema?.outputSchema,
        data: node.data,
      };
    });

    console.log("Detected schemas:", schemas.length);
    return schemas;
  }, [inputNodes]);

  // Check compatibility between input and output schemas
  const compatibilityStatus = useMemo(() => {
    if (!detectedInputSchema || !enhancedSchema?.inputSchema) {
      return { status: "no_connection", message: "No connected input nodes" };
    }

    // Enhanced compatibility check with detailed analysis
    const inputSchema = extractSchemaDefinition(enhancedSchema.inputSchema);
    const mismatches: Array<{
      field: string;
      expected: string;
      received: string;
    }> = [];

    detectedInputSchema.forEach((schema) => {
      const outputSchema = extractSchemaDefinition(schema.outputSchema);
      if (outputSchema?.properties && inputSchema?.properties) {
        Object.keys(inputSchema.properties).forEach((inputField) => {
          const inputFieldSchema = inputSchema.properties[inputField];
          const outputFieldSchema = outputSchema.properties[inputField];

          if (
            outputFieldSchema &&
            inputFieldSchema.type !== outputFieldSchema.type
          ) {
            mismatches.push({
              field: inputField,
              expected: inputFieldSchema.type,
              received: outputFieldSchema.type,
            });
          }
        });
      }
    });

    if (mismatches.length > 0) {
      return {
        status: "incompatible",
        message: `${mismatches.length} type mismatch${mismatches.length > 1 ? "es" : ""} detected`,
        mismatches,
      };
    }

    const hasCompatibleData = detectedInputSchema.some(
      (schema) =>
        schema.outputSchema &&
        Object.keys(
          extractSchemaDefinition(schema.outputSchema)?.properties || {}
        ).length > 0
    );

    if (hasCompatibleData) {
      return { status: "compatible", message: "Data types are compatible" };
    } else {
      return {
        status: "incompatible",
        message: "Data types may be incompatible",
      };
    }
  }, [detectedInputSchema, enhancedSchema]);

  // Get sample data from previous executions
  const getSampleData = async (nodeId: string) => {
    try {
      // Get recent executions for the current workflow
      const workflowId = workflowData?.workflowId as string;
      if (!workflowId) return null;

      const executions = await executionsApi.getWorkflowExecutions(
        workflowId,
        5,
        0,
        "completed"
      );

      // Find the most recent successful execution
      const recentExecution = executions.data?.[0];
      if (!recentExecution) return null;

      // Get node executions for this execution
      const nodeExecutions = await executionsApi.getNodeExecutions(
        recentExecution.id
      );

      // Find the specific node's execution data
      const nodeExecution = nodeExecutions.find(
        (node: any) => node.node_id === nodeId
      );

      if (nodeExecution?.output_data) {
        return nodeExecution.output_data;
      }

      // Fallback to mock data if no real data available
      const node = inputNodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const nodeType = getBlockType(node.data || node);
      switch (nodeType) {
        case "HTTP_REQUEST":
          return {
            status: 200,
            data: { message: "Success", id: 123 },
            headers: { "content-type": "application/json" },
          };
        case "PRICE_MONITOR":
          return {
            price: 45000.5,
            asset: "ETHEREUM",
            timestamp: new Date().toISOString(),
          };
        case "EMAIL":
          return {
            to: "user@example.com",
            subject: "Test Email",
            body: "This is a test email",
          };
        default:
          return { message: "Sample data", value: 42 };
      }
    } catch (error) {
      console.warn("Failed to fetch sample data:", error);
      return null;
    }
  };

  const ConfigComponent = blockConfigRegistry.get(blockType);

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      case "running":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className='w-4 h-4' />;
      case "error":
        return <AlertCircle className='w-4 h-4' />;
      case "warning":
        return <AlertTriangle className='w-4 h-4' />;
      case "running":
        return <Loader2 className='w-4 h-4 animate-spin' />;
      default:
        return <Info className='w-4 h-4' />;
    }
  };

  if (!ConfigComponent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Block Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              No configuration component found for block type: {blockType}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Connection Status Header */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              {metadata?.icon && (
                <div className='w-5 h-5 bg-gray-100 rounded flex items-center justify-center'>
                  <span className='text-xs'>{metadata.icon}</span>
                </div>
              )}
              <CardTitle className='text-lg'>
                {metadata?.label || blockType}
              </CardTitle>
            </div>
            <div className='flex items-center space-x-2'>
              {/* Connection Status */}
              <div className='flex items-center space-x-1'>
                {inputNodes.length > 0 ? (
                  <Link className='w-4 h-4 text-green-600' />
                ) : (
                  <Unlink className='w-4 h-4 text-gray-400' />
                )}
                <span className='text-sm text-gray-600'>
                  {inputNodes.length} input{inputNodes.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Execution Status */}
              <div
                className={`flex items-center space-x-1 ${getExecutionStatusColor(executionStatus)}`}>
                {getExecutionStatusIcon(executionStatus)}
                <span className='text-sm capitalize'>{executionStatus}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='config'>Configuration</TabsTrigger>
          <TabsTrigger value='inputs'>Inputs</TabsTrigger>
          <TabsTrigger value='outputs'>Outputs</TabsTrigger>
          <TabsTrigger value='execution'>Execution</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value='config' className='space-y-4'>
          <ConfigComponent
            config={
              (data as Record<string, unknown>)?.config ||
              ({} as Record<string, unknown>)
            }
            onChange={(config) => {
              console.log("ConfigComponent onChange called with:", config);
              console.log("Current data:", data);
              const newData = {
                ...(data as Record<string, unknown>),
                config,
              };
              console.log("New data to be passed to onChange:", newData);
              onChange(newData);
            }}
            executionStatus={executionStatus}
            executionData={executionData}
            onTest={onTest}
          />
        </TabsContent>

        {/* Inputs Tab - Show detected input schemas */}
        <TabsContent value='inputs' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Input Data</CardTitle>
                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setShowInputSchema(!showInputSchema)}>
                    {showInputSchema ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                    {showInputSchema ? "Hide" : "Show"} Details
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {detectedInputSchema && detectedInputSchema.length > 0 ? (
                <div className='space-y-4'>
                  {/* Compatibility Status */}
                  <Alert
                    variant={
                      compatibilityStatus.status === "compatible"
                        ? "default"
                        : "destructive"
                    }>
                    {compatibilityStatus.status === "compatible" ? (
                      <CheckCircle className='h-4 w-4' />
                    ) : (
                      <AlertCircle className='h-4 w-4' />
                    )}
                    <AlertDescription>
                      {compatibilityStatus.message}
                    </AlertDescription>
                  </Alert>

                  {/* Data Transformation Suggestion */}
                  {compatibilityStatus.status === "incompatible" &&
                    compatibilityStatus.mismatches && (
                      <Alert
                        variant='default'
                        className='border-orange-200 bg-orange-50'>
                        <AlertTriangle className='h-4 w-4 text-orange-600' />
                        <AlertDescription className='text-orange-800'>
                          <div className='space-y-2'>
                            <p className='font-medium'>
                              Type mismatches detected:
                            </p>
                            <div className='space-y-1'>
                              {compatibilityStatus.mismatches.map(
                                (mismatch, idx) => (
                                  <div key={idx} className='text-sm'>
                                    <span className='font-medium'>
                                      {mismatch.field}:
                                    </span>
                                    <span className='text-orange-700'>
                                      {" "}
                                      {mismatch.received} → {mismatch.expected}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                            <div className='mt-3 p-2 bg-orange-100 rounded border border-orange-200'>
                              <p className='text-sm font-medium text-orange-800 mb-1'>
                                💡 Suggestion:
                              </p>
                              <p className='text-xs text-orange-700'>
                                Add a "Data Transform" block between these
                                blocks to convert the data types.
                              </p>
                              <Button
                                size='sm'
                                variant='outline'
                                className='mt-2 text-xs h-6 px-2 border-orange-300 text-orange-700 hover:bg-orange-200'
                                onClick={() => {
                                  // This would trigger adding a data transform block
                                  console.log("Add data transform block");
                                }}>
                                Add Data Transform Block
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                  {/* Connected Input Nodes */}
                  {detectedInputSchema.map((schema, index) => {
                    const nodeSampleData = sampleData[schema.nodeId];
                    return (
                      <Card
                        key={index}
                        className='p-4 border-l-4 border-l-blue-500'>
                        <div className='flex items-center justify-between mb-4'>
                          <div className='flex items-center space-x-2'>
                            <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                              <ArrowDown className='w-4 h-4 text-blue-600' />
                            </div>
                            <div>
                              <div className='flex items-center space-x-2'>
                                <Badge
                                  variant='outline'
                                  className='bg-blue-50 text-blue-700'>
                                  {schema.nodeType}
                                </Badge>
                                <span className='text-sm font-medium text-gray-900'>
                                  {schema.nodeType} Block
                                </span>
                              </div>
                              <p className='text-xs text-gray-500 mt-1'>
                                Providing data to this block
                              </p>
                            </div>
                          </div>
                        </div>

                        {showInputSchema && schema.outputSchema && (
                          <div className='space-y-3'>
                            <div className='flex items-center space-x-2'>
                              <Label className='text-sm font-medium text-gray-700'>
                                Available Data Fields:
                              </Label>
                              <Badge variant='secondary' className='text-xs'>
                                {
                                  Object.keys(
                                    extractSchemaDefinition(schema.outputSchema)
                                      ?.properties || {}
                                  ).length
                                }{" "}
                                fields
                              </Badge>
                            </div>

                            <div className='grid gap-2'>
                              {Object.entries(
                                extractSchemaDefinition(schema.outputSchema)
                                  ?.properties || {}
                              ).map(
                                ([fieldName, fieldSchema]: [string, any]) => (
                                  <div
                                    key={fieldName}
                                    className='flex items-center justify-between p-2 bg-gray-50 rounded-md'>
                                    <div className='flex items-center space-x-2'>
                                      <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                      <span className='text-sm font-medium text-gray-900'>
                                        {fieldName}
                                      </span>
                                      <Badge
                                        variant='outline'
                                        className='text-xs'>
                                        {fieldSchema.type}
                                      </Badge>
                                    </div>
                                    {fieldSchema.description && (
                                      <span className='text-xs text-gray-500'>
                                        {fieldSchema.description}
                                      </span>
                                    )}
                                  </div>
                                )
                              )}
                            </div>

                            {/* Sample Data Section */}
                            {nodeSampleData && (
                              <div className='mt-4 p-3 bg-blue-50 rounded-md border border-blue-200'>
                                <div className='flex items-center space-x-2 mb-2'>
                                  <div className='w-4 h-4 bg-blue-500 rounded-full'></div>
                                  <Label className='text-sm font-medium text-gray-700'>
                                    Sample Data from Previous Execution:
                                  </Label>
                                </div>
                                <pre className='text-xs bg-white p-2 rounded border overflow-auto max-h-32'>
                                  {JSON.stringify(nodeSampleData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : enhancedSchema?.inputSchema ? (
                <div className='space-y-4'>
                  <Alert>
                    <Info className='h-4 w-4' />
                    <AlertDescription>
                      This block expects specific data. Connect it to another
                      block to provide the required information.
                    </AlertDescription>
                  </Alert>

                  {showInputSchema && (
                    <div className='space-y-3'>
                      <div className='flex items-center space-x-2'>
                        <Label className='text-sm font-medium text-gray-700'>
                          Required Data Fields:
                        </Label>
                        <Badge variant='secondary' className='text-xs'>
                          {
                            Object.keys(
                              extractSchemaDefinition(
                                enhancedSchema.inputSchema
                              )?.properties || {}
                            ).length
                          }{" "}
                          fields
                        </Badge>
                      </div>

                      <div className='grid gap-2'>
                        {Object.entries(
                          extractSchemaDefinition(enhancedSchema.inputSchema)
                            ?.properties || {}
                        ).map(([fieldName, fieldSchema]: [string, any]) => (
                          <div
                            key={fieldName}
                            className='flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200'>
                            <div className='flex items-center space-x-2'>
                              <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                              <span className='text-sm font-medium text-gray-900'>
                                {fieldName}
                              </span>
                              <Badge variant='outline' className='text-xs'>
                                {fieldSchema.type}
                              </Badge>
                              {extractSchemaDefinition(
                                enhancedSchema.inputSchema
                              )?.required?.includes(fieldName) && (
                                <Badge
                                  variant='destructive'
                                  className='text-xs'>
                                  Required
                                </Badge>
                              )}
                            </div>
                            {fieldSchema.description && (
                              <span className='text-xs text-gray-500'>
                                {fieldSchema.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Unlink className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                  <p className='font-medium text-gray-900 mb-2'>
                    No Input Data
                  </p>
                  <p className='text-sm'>
                    Connect this block to another block to see what data it will
                    receive
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outputs Tab - Show this block's output schema */}
        <TabsContent value='outputs' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Output Data</CardTitle>
                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setShowOutputSchema(!showOutputSchema)}>
                    {showOutputSchema ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                    {showOutputSchema ? "Hide" : "Show"} Details
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {enhancedSchema?.outputSchema ? (
                <div className='space-y-4'>
                  {showOutputSchema && (
                    <div className='space-y-3'>
                      <div className='flex items-center space-x-2'>
                        <Label className='text-sm font-medium text-gray-700'>
                          Available Output Fields:
                        </Label>
                        <Badge variant='secondary' className='text-xs'>
                          {
                            Object.keys(
                              extractSchemaDefinition(
                                enhancedSchema.outputSchema
                              )?.properties || {}
                            ).length
                          }{" "}
                          fields
                        </Badge>
                      </div>

                      <div className='grid gap-2'>
                        {Object.entries(
                          extractSchemaDefinition(enhancedSchema.outputSchema)
                            ?.properties || {}
                        ).map(([fieldName, fieldSchema]: [string, any]) => (
                          <div
                            key={fieldName}
                            className='flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200'>
                            <div className='flex items-center space-x-2'>
                              <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                              <span className='text-sm font-medium text-gray-900'>
                                {fieldName}
                              </span>
                              <Badge variant='outline' className='text-xs'>
                                {fieldSchema.type}
                              </Badge>
                            </div>
                            {fieldSchema.description && (
                              <span className='text-xs text-gray-500'>
                                {fieldSchema.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example Output */}
                  {executionData?.lastResponse && (
                    <div className='mt-4 p-3 bg-green-50 rounded-md border border-green-200'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <CheckCircle className='w-4 h-4 text-green-600' />
                        <Label className='text-sm font-medium text-gray-700'>
                          Last Execution Output:
                        </Label>
                      </div>
                      <pre className='text-xs bg-white p-2 rounded border overflow-auto max-h-32'>
                        {JSON.stringify(executionData.lastResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Info className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                  <p className='font-medium text-gray-900 mb-2'>
                    No Output Data
                  </p>
                  <p className='text-sm'>
                    This block doesn't produce any output data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution Tab */}
        <TabsContent value='execution' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Execution Details</CardTitle>
            </CardHeader>
            <CardContent>
              {executionStatus !== "idle" ? (
                <div className='space-y-4'>
                  <div className='flex items-center space-x-2'>
                    {getExecutionStatusIcon(executionStatus)}
                    <span className='capitalize'>{executionStatus}</span>
                  </div>

                  {executionData && (
                    <div className='space-y-2'>
                      {executionData.startTime && (
                        <div className='flex justify-between'>
                          <span className='text-sm text-gray-600'>
                            Start Time:
                          </span>
                          <span className='text-sm'>
                            {executionData.startTime}
                          </span>
                        </div>
                      )}

                      {executionData.endTime && (
                        <div className='flex justify-between'>
                          <span className='text-sm text-gray-600'>
                            End Time:
                          </span>
                          <span className='text-sm'>
                            {executionData.endTime}
                          </span>
                        </div>
                      )}

                      {executionData.duration && (
                        <div className='flex justify-between'>
                          <span className='text-sm text-gray-600'>
                            Duration:
                          </span>
                          <span className='text-sm'>
                            {executionData.duration}ms
                          </span>
                        </div>
                      )}

                      {executionData.error && (
                        <Alert variant='destructive'>
                          <AlertCircle className='h-4 w-4' />
                          <AlertDescription>
                            {executionData.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Info className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                  <p>No execution data</p>
                  <p className='text-sm'>
                    Run the block to see execution details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Button */}
      {onTest && (
        <div className='flex justify-end'>
          <Button onClick={onTest} disabled={executionStatus === "running"}>
            {executionStatus === "running" ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Play className='w-4 h-4 mr-2' />
            )}
            Test Block
          </Button>
        </div>
      )}
    </div>
  );
}
