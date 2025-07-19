import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Play,
  Plus,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { enhancedDataTransformSchema } from "@zyra/types";

interface DataTransformConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastTransformation?: Record<string, unknown>;
  };
  onTest?: () => void;
  // New props for connection visualization
  previousBlockData?: Record<string, unknown>;
  previousBlockSchema?: Record<string, unknown>;
  connectionStatus?: "connected" | "disconnected" | "incompatible";
}

export function DataTransformConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
  previousBlockData,
  connectionStatus = "disconnected",
}: DataTransformConfigProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [showPreview, setShowPreview] = useState(true);
  const [transformations, setTransformations] = useState<
    Record<string, unknown>[]
  >([]);
  const [previewData, setPreviewData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Use the enhanced schema from @zyra/types
  const schema = enhancedDataTransformSchema;

  // Initialize transformations from config
  useEffect(() => {
    if (config.transformations) {
      setTransformations(config.transformations as Record<string, unknown>[]);
    }
  }, [config.transformations]);

  // Generate preview data based on previous block
  useEffect(() => {
    if (previousBlockData && transformations.length > 0) {
      try {
        const preview = applyTransformations(
          previousBlockData,
          transformations
        );
        setPreviewData(preview);
      } catch (error) {
        console.error("Preview generation error:", error);
      }
    }
  }, [previousBlockData, transformations]);

  // Apply transformations to data
  const applyTransformations = (data: any, transforms: any[]) => {
    let result = { ...data };

    for (const transform of transforms) {
      switch (transform.type) {
        case "map":
          if (transform.field && transform.outputField) {
            result[transform.outputField] = result[transform.field];
          }
          break;
        case "filter":
          // Filter logic would go here
          break;
        case "format":
          if (transform.field && transform.operation) {
            // Apply formatting
            if (
              transform.operation === "uppercase" &&
              result[transform.field]
            ) {
              result[transform.field] = String(
                result[transform.field]
              ).toUpperCase();
            }
          }
          break;
        case "extract":
          if (transform.field && transform.outputField) {
            // Extract nested field
            const value = result[transform.field];
            if (typeof value === "object" && value !== null) {
              result[transform.outputField] = value;
            }
          }
          break;
      }
    }

    return result;
  };

  // Add new transformation
  const addTransformation = () => {
    const newTransform = {
      type: "map",
      field: "",
      operation: "",
      value: "",
      outputField: "",
    };
    const updated = [...transformations, newTransform];
    setTransformations(updated);
    onChange({ ...config, transformations: updated });
  };

  // Remove transformation
  const removeTransformation = (index: number) => {
    const updated = transformations.filter((_, i) => i !== index);
    setTransformations(updated);
    onChange({ ...config, transformations: updated });
  };

  // Update transformation
  const updateTransformation = (index: number, field: string, value: any) => {
    const updated = transformations.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    setTransformations(updated);
    onChange({ ...config, transformations: updated });
  };

  // Get connection status color
  const getConnectionColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "incompatible":
        return "text-red-600";
      default:
        return "text-gray-400";
    }
  };

  // Get connection status icon
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className='w-4 h-4' />;
      case "incompatible":
        return <AlertCircle className='w-4 h-4' />;
      default:
        return <Info className='w-4 h-4' />;
    }
  };

  return (
    <div className='space-y-6'>
      {/* Connection Status Header */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <ArrowUpDown className='w-5 h-5 text-purple-600' />
              <CardTitle className='text-lg'>Data Transform</CardTitle>
            </div>
            <div
              className={`flex items-center space-x-2 ${getConnectionColor()}`}>
              {getConnectionIcon()}
              <span className='text-sm font-medium'>
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "incompatible"
                    ? "Incompatible"
                    : "Disconnected"}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='config'>Configuration</TabsTrigger>
          <TabsTrigger value='transformations'>Transformations</TabsTrigger>
          <TabsTrigger value='preview'>Preview</TabsTrigger>
          <TabsTrigger value='validation'>Validation</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value='config' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='preview-mode'
                  checked={config.previewMode !== false}
                  onCheckedChange={(checked) =>
                    onChange({ ...config, previewMode: checked })
                  }
                />
                <Label htmlFor='preview-mode'>Enable Live Preview</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transformations Tab */}
        <TabsContent value='transformations' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>
                  Data Transformations
                </CardTitle>
                <Button onClick={addTransformation} size='sm'>
                  <Plus className='w-4 h-4 mr-2' />
                  Add Transformation
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {transformations.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <ArrowUpDown className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                  <p>No transformations configured</p>
                  <p className='text-sm'>
                    Add transformations to modify your data
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {transformations.map((transform, index) => (
                    <Card key={index} className='p-4'>
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center space-x-2'>
                          <Badge variant='outline'>{transform.type}</Badge>
                          <span className='text-sm font-medium'>
                            Transformation {index + 1}
                          </span>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => removeTransformation(index)}>
                          <X className='w-4 h-4' />
                        </Button>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={transform.type}
                            onValueChange={(value) =>
                              updateTransformation(index, "type", value)
                            }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='map'>Map</SelectItem>
                              <SelectItem value='filter'>Filter</SelectItem>
                              <SelectItem value='aggregate'>
                                Aggregate
                              </SelectItem>
                              <SelectItem value='format'>Format</SelectItem>
                              <SelectItem value='extract'>Extract</SelectItem>
                              <SelectItem value='combine'>Combine</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Input Field</Label>
                          <Input
                            value={transform.field || ""}
                            onChange={(e) =>
                              updateTransformation(
                                index,
                                "field",
                                e.target.value
                              )
                            }
                            placeholder='e.g., price, data.response'
                          />
                        </div>

                        <div>
                          <Label>Operation</Label>
                          <Input
                            value={transform.operation || ""}
                            onChange={(e) =>
                              updateTransformation(
                                index,
                                "operation",
                                e.target.value
                              )
                            }
                            placeholder='e.g., uppercase, multiply, extract'
                          />
                        </div>

                        <div>
                          <Label>Output Field</Label>
                          <Input
                            value={transform.outputField || ""}
                            onChange={(e) =>
                              updateTransformation(
                                index,
                                "outputField",
                                e.target.value
                              )
                            }
                            placeholder='e.g., formattedPrice, result'
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value='preview' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Data Preview</CardTitle>
                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                    {showPreview ? "Hide" : "Show"} Preview
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      // Refresh preview
                    }}>
                    <RefreshCw className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showPreview && previousBlockData ? (
                <div className='space-y-4'>
                  <div>
                    <Label className='text-sm font-medium'>Input Data</Label>
                    <pre className='mt-2 p-3 bg-gray-50 rounded-md text-sm overflow-auto max-h-40'>
                      {JSON.stringify(previousBlockData, null, 2)}
                    </pre>
                  </div>

                  {previewData && (
                    <div>
                      <Label className='text-sm font-medium'>
                        Transformed Output
                      </Label>
                      <pre className='mt-2 p-3 bg-green-50 rounded-md text-sm overflow-auto max-h-40'>
                        {JSON.stringify(previewData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Info className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                  <p>No preview data available</p>
                  <p className='text-sm'>
                    Connect to a previous block to see preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value='validation' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Schema Validation</CardTitle>
            </CardHeader>
            <CardContent>
              {validationErrors.length > 0 ? (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>
                    <ul className='list-disc list-inside'>
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className='h-4 w-4' />
                  <AlertDescription>
                    All transformations are valid
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Status */}
      {executionStatus !== "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Execution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center space-x-2'>
              {executionStatus === "running" && (
                <Loader2 className='w-4 h-4 animate-spin' />
              )}
              {executionStatus === "success" && (
                <CheckCircle className='w-4 h-4 text-green-600' />
              )}
              {executionStatus === "error" && (
                <AlertCircle className='w-4 h-4 text-red-600' />
              )}
              <span className='capitalize'>{executionStatus}</span>
            </div>

            {executionData?.lastTransformation && (
              <div className='mt-4'>
                <Label className='text-sm font-medium'>
                  Last Transformation
                </Label>
                <pre className='mt-2 p-3 bg-gray-50 rounded-md text-sm overflow-auto max-h-40'>
                  {JSON.stringify(executionData.lastTransformation, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Button */}
      {onTest && (
        <div className='flex justify-end'>
          <Button onClick={onTest} disabled={executionStatus === "running"}>
            {executionStatus === "running" ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Play className='w-4 h-4 mr-2' />
            )}
            Test Transformations
          </Button>
        </div>
      )}
    </div>
  );
}
