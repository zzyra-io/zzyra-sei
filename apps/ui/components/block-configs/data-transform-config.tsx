import React, { useEffect, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
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
import { enhancedDataTransformSchema } from "@zzyra/types";
import { TransformationTemplateSelector } from "@/components/transformation-template-selector";

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSteps, setPreviewSteps] = useState<any[]>([]);
  const [debouncedTransformations] = useDebounce(transformations, 500);

  // Use the enhanced schema from @zzyra/types
  const schema = enhancedDataTransformSchema;

  // Initialize transformations from config
  useEffect(() => {
    if (config.transformations) {
      setTransformations(config.transformations as Record<string, unknown>[]);
    }
  }, [config.transformations]);

  // Generate preview data using API
  const generatePreview = useCallback(async () => {
    if (!previousBlockData || debouncedTransformations.length === 0) {
      setPreviewData(null);
      setPreviewSteps([]);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch('/api/transformations/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: previousBlockData,
          transformations: debouncedTransformations
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewData(result.data);
        setPreviewSteps(result.steps || []);
        setValidationErrors([]);
      } else {
        throw new Error('Preview generation failed');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setValidationErrors([error.message]);
    } finally {
      setPreviewLoading(false);
    }
  }, [previousBlockData, debouncedTransformations]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  // Validate transformations using API
  const validateTransformations = useCallback(async () => {
    if (transformations.length === 0) {
      setValidationErrors([]);
      return;
    }

    try {
      const response = await fetch('/api/transformations/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transformations
        })
      });

      if (response.ok) {
        const result = await response.json();
        const errors = result.errors.flatMap((err: any) => err.errors);
        setValidationErrors(errors);
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  }, [transformations]);

  useEffect(() => {
    validateTransformations();
  }, [validateTransformations]);

  // Helper function to update config
  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
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
        <TabsList className='grid w-full grid-cols-5'>
          <TabsTrigger value='config'>Configuration</TabsTrigger>
          <TabsTrigger value='transformations'>Transformations</TabsTrigger>
          <TabsTrigger value='templates'>Templates</TabsTrigger>
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
                              <SelectItem value='conditional'>Conditional</SelectItem>
                              <SelectItem value='loop'>Loop</SelectItem>
                              <SelectItem value='sort'>Sort</SelectItem>
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
                          {transform.type === 'format' ? (
                            <Select
                              value={transform.operation || ""}
                              onValueChange={(value) =>
                                updateTransformation(index, "operation", value)
                              }>
                              <SelectTrigger>
                                <SelectValue placeholder="Select operation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='uppercase'>Uppercase</SelectItem>
                                <SelectItem value='lowercase'>Lowercase</SelectItem>
                                <SelectItem value='trim'>Trim</SelectItem>
                                <SelectItem value='title_case'>Title Case</SelectItem>
                                <SelectItem value='parse_number'>Parse Number</SelectItem>
                                <SelectItem value='to_string'>To String</SelectItem>
                                <SelectItem value='parse_boolean'>Parse Boolean</SelectItem>
                                <SelectItem value='multiply'>Multiply</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : transform.type === 'aggregate' ? (
                            <Select
                              value={transform.operation || ""}
                              onValueChange={(value) =>
                                updateTransformation(index, "operation", value)
                              }>
                              <SelectTrigger>
                                <SelectValue placeholder="Select operation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='sum'>Sum</SelectItem>
                                <SelectItem value='avg'>Average</SelectItem>
                                <SelectItem value='count'>Count</SelectItem>
                                <SelectItem value='max'>Maximum</SelectItem>
                                <SelectItem value='min'>Minimum</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : transform.type === 'filter' ? (
                            <Select
                              value={transform.operation || ""}
                              onValueChange={(value) =>
                                updateTransformation(index, "operation", value)
                              }>
                              <SelectTrigger>
                                <SelectValue placeholder="Select operation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='exists'>Exists</SelectItem>
                                <SelectItem value='equals'>Equals</SelectItem>
                                <SelectItem value='not_equals'>Not Equals</SelectItem>
                                <SelectItem value='greater_than'>Greater Than</SelectItem>
                                <SelectItem value='less_than'>Less Than</SelectItem>
                                <SelectItem value='contains'>Contains</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
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
                          )}
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

                        {(transform.operation === 'multiply' || transform.operation === 'equals' || transform.operation === 'greater_than' || transform.operation === 'less_than' || transform.operation === 'contains') && (
                          <div className='col-span-2'>
                            <Label>Value</Label>
                            <Input
                              value={transform.value || ""}
                              onChange={(e) =>
                                updateTransformation(
                                  index,
                                  "value",
                                  e.target.value
                                )
                              }
                              placeholder='Enter value for operation'
                            />
                          </div>
                        )}

                        {transform.type === 'filter' && (
                          <div className='col-span-2'>
                            <Label>Condition (JavaScript expression)</Label>
                            <Input
                              value={transform.condition || ""}
                              onChange={(e) =>
                                updateTransformation(
                                  index,
                                  "condition",
                                  e.target.value
                                )
                              }
                              placeholder='e.g., price > 100 && status === "active"'
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value='templates' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Transformation Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <TransformationTemplateSelector
                onApplyTemplate={(templateTransformations) => {
                  const updated = [...transformations, ...templateTransformations];
                  setTransformations(updated);
                  updateConfig({ transformations: updated });
                }}
                currentTransformations={transformations}
              />
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
                    onClick={generatePreview}
                    disabled={previewLoading}>
                    {previewLoading ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <RefreshCw className='w-4 h-4' />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {previewLoading ? (
                <div className='text-center py-8'>
                  <Loader2 className='w-8 h-8 mx-auto mb-4 animate-spin text-blue-500' />
                  <p className='text-sm text-muted-foreground'>Generating preview...</p>
                </div>
              ) : showPreview && previousBlockData ? (
                <div className='space-y-4'>
                  <div>
                    <Label className='text-sm font-medium'>Input Data</Label>
                    <pre className='mt-2 p-3 bg-gray-50 rounded-md text-sm overflow-auto max-h-40'>
                      {JSON.stringify(previousBlockData, null, 2)}
                    </pre>
                  </div>

                  {previewSteps.length > 0 && (
                    <div>
                      <Label className='text-sm font-medium mb-2 block'>
                        Transformation Steps
                      </Label>
                      <div className='space-y-2 max-h-60 overflow-auto'>
                        {previewSteps.map((step, index) => (
                          <div key={index} className='border rounded p-2 bg-gray-50'>
                            <div className='flex items-center justify-between mb-1'>
                              <span className='text-sm font-medium'>Step {step.step}: {step.transformation.type}</span>
                              <Badge variant={step.success ? 'default' : 'destructive'} className='text-xs'>
                                {step.success ? 'Success' : 'Failed'}
                              </Badge>
                            </div>
                            <pre className='text-xs bg-white p-2 rounded overflow-auto max-h-20'>
                              {JSON.stringify(step.output, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewData && (
                    <div>
                      <Label className='text-sm font-medium'>
                        Final Output
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
