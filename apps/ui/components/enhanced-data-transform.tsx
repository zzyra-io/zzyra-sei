"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Play,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  Code,
  Zap,
  Database,
  Filter,
  Shuffle,
  Target,
  Loader2,
} from "lucide-react";

interface DataTransformation {
  id: string;
  type: 'map' | 'filter' | 'aggregate' | 'format' | 'extract' | 'combine' | 'validate' | 'enrich';
  sourceField?: string;
  targetField?: string;
  operation: string;
  value?: any;
  condition?: string;
  priority?: number;
  enabled: boolean;
}

interface DataPipeline {
  id: string;
  transformations: DataTransformation[];
  inputSchema?: any;
  outputSchema?: any;
  metadata?: {
    name: string;
    description: string;
    version: string;
  };
}

interface TransformationResult {
  success: boolean;
  data: any;
  errors: string[];
  warnings: string[];
  metadata: {
    executionTime: number;
    transformationsApplied: number;
    dataSize: {
      input: number;
      output: number;
    };
  };
}

interface EnhancedDataTransformProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  previousBlockData?: any;
  nodeId?: string;
  executionId?: string;
  onTest?: () => void;
}

export function EnhancedDataTransform({
  config,
  onChange,
  previousBlockData,
  nodeId,
  executionId,
  onTest
}: EnhancedDataTransformProps) {
  const [pipeline, setPipeline] = useState<DataPipeline>({
    id: `pipeline-${nodeId || 'default'}`,
    transformations: [],
    metadata: {
      name: 'Data Transformation Pipeline',
      description: 'Custom data transformation pipeline',
      version: '1.0.0'
    }
  });

  const [previewResult, setPreviewResult] = useState<TransformationResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedTransformation, setSelectedTransformation] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize pipeline from config
  useEffect(() => {
    if (config.transformations) {
      const transformations = (config.transformations as any[]).map((t, index) => ({
        id: t.id || `transform-${index}`,
        type: t.type || 'map',
        sourceField: t.sourceField || t.field,
        targetField: t.targetField || t.outputField,
        operation: t.operation || '',
        value: t.value,
        condition: t.condition,
        priority: t.priority || index,
        enabled: t.enabled !== false,
      }));

      setPipeline(prev => ({
        ...prev,
        transformations,
        metadata: config.metadata as any || prev.metadata
      }));
    }
  }, [config]);

  // Auto-generate preview when data or pipeline changes
  useEffect(() => {
    if (previousBlockData && pipeline.transformations.length > 0 && showPreview) {
      generatePreview();
    }
  }, [previousBlockData, pipeline.transformations, showPreview]);

  // Generate preview of transformation result
  const generatePreview = useCallback(async () => {
    if (!previousBlockData || pipeline.transformations.length === 0) {
      return;
    }

    setIsPreviewLoading(true);
    try {
      // Simulate the backend transformation service
      const result = await simulateTransformationPipeline(previousBlockData, pipeline);
      setPreviewResult(result);
      
      if (result.errors.length > 0) {
        setValidationErrors(result.errors);
      } else {
        setValidationErrors([]);
      }
    } catch (error) {
      console.error('Preview generation failed:', error);
      setValidationErrors([`Preview generation failed: ${error.message}`]);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [previousBlockData, pipeline]);

  // Simulate the backend DataTransformationService
  const simulateTransformationPipeline = async (
    data: any, 
    pipeline: DataPipeline
  ): Promise<TransformationResult> => {
    const startTime = Date.now();
    const inputSize = JSON.stringify(data).length;
    const errors: string[] = [];
    const warnings: string[] = [];
    let transformedData = JSON.parse(JSON.stringify(data));
    let transformationsApplied = 0;

    // Sort transformations by priority
    const sortedTransformations = [...pipeline.transformations]
      .filter(t => t.enabled)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (const transformation of sortedTransformations) {
      try {
        transformedData = await applyTransformation(transformedData, transformation);
        transformationsApplied++;
      } catch (error) {
        errors.push(`Transformation ${transformation.id} failed: ${error.message}`);
      }
    }

    const outputSize = JSON.stringify(transformedData).length;

    return {
      success: errors.length === 0,
      data: transformedData,
      errors,
      warnings,
      metadata: {
        executionTime: Date.now() - startTime,
        transformationsApplied,
        dataSize: { input: inputSize, output: outputSize }
      }
    };
  };

  // Apply individual transformation
  const applyTransformation = async (data: any, transformation: DataTransformation): Promise<any> => {
    let result = { ...data };

    switch (transformation.type) {
      case 'map':
        if (transformation.sourceField && transformation.targetField) {
          const sourceValue = getNestedValue(data, transformation.sourceField);
          if (sourceValue !== undefined) {
            setNestedValue(result, transformation.targetField, sourceValue);
            if (transformation.operation === 'rename') {
              deleteNestedValue(result, transformation.sourceField);
            }
          }
        }
        break;

      case 'filter':
        if (transformation.condition) {
          try {
            const conditionFunc = new Function('data', `return ${transformation.condition}`);
            const shouldKeep = conditionFunc(data);
            if (!shouldKeep) {
              return null;
            }
          } catch (error) {
            throw new Error(`Invalid filter condition: ${transformation.condition}`);
          }
        }
        break;

      case 'format':
        if (transformation.sourceField) {
          const value = getNestedValue(data, transformation.sourceField);
          let formattedValue = value;
          
          switch (transformation.operation) {
            case 'uppercase':
              formattedValue = typeof value === 'string' ? value.toUpperCase() : value;
              break;
            case 'lowercase':
              formattedValue = typeof value === 'string' ? value.toLowerCase() : value;
              break;
            case 'trim':
              formattedValue = typeof value === 'string' ? value.trim() : value;
              break;
            case 'number':
              formattedValue = Number(value);
              break;
            case 'string':
              formattedValue = String(value);
              break;
          }
          
          const targetField = transformation.targetField || transformation.sourceField;
          setNestedValue(result, targetField, formattedValue);
        }
        break;

      case 'extract':
        if (transformation.sourceField && transformation.targetField) {
          const extracted = getNestedValue(data, transformation.sourceField);
          setNestedValue(result, transformation.targetField, extracted);
        }
        break;

      case 'aggregate':
        if (Array.isArray(data) && transformation.operation) {
          switch (transformation.operation) {
            case 'sum':
              result = data.reduce((sum, item) => {
                const value = transformation.sourceField 
                  ? getNestedValue(item, transformation.sourceField)
                  : item;
                return sum + (typeof value === 'number' ? value : 0);
              }, 0);
              break;
            case 'count':
              result = data.length;
              break;
            case 'avg':
              const sum = data.reduce((sum, item) => {
                const value = transformation.sourceField 
                  ? getNestedValue(item, transformation.sourceField)
                  : item;
                return sum + (typeof value === 'number' ? value : 0);
              }, 0);
              result = sum / data.length;
              break;
          }
        }
        break;

      case 'enrich':
        if (transformation.targetField) {
          switch (transformation.operation) {
            case 'timestamp':
              setNestedValue(result, transformation.targetField, new Date().toISOString());
              break;
            case 'uuid':
              setNestedValue(result, transformation.targetField, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
              break;
            default:
              if (transformation.value !== undefined) {
                setNestedValue(result, transformation.targetField, transformation.value);
              }
          }
        }
        break;
    }

    return result;
  };

  // Utility functions for nested object access
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  };

  const setNestedValue = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  const deleteNestedValue = (obj: any, path: string): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      return current && current[key] ? current[key] : {};
    }, obj);
    delete target[lastKey];
  };

  // Add new transformation
  const addTransformation = (type: DataTransformation['type']) => {
    const newTransformation: DataTransformation = {
      id: `transform-${Date.now()}`,
      type,
      operation: '',
      enabled: true,
      priority: pipeline.transformations.length,
    };

    const updatedPipeline = {
      ...pipeline,
      transformations: [...pipeline.transformations, newTransformation]
    };

    setPipeline(updatedPipeline);
    onChange({ 
      ...config, 
      transformations: updatedPipeline.transformations,
      metadata: updatedPipeline.metadata 
    });
    setSelectedTransformation(newTransformation.id);
  };

  // Update transformation
  const updateTransformation = (id: string, updates: Partial<DataTransformation>) => {
    const updatedTransformations = pipeline.transformations.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );

    const updatedPipeline = {
      ...pipeline,
      transformations: updatedTransformations
    };

    setPipeline(updatedPipeline);
    onChange({ 
      ...config, 
      transformations: updatedTransformations,
      metadata: updatedPipeline.metadata 
    });
  };

  // Remove transformation
  const removeTransformation = (id: string) => {
    const updatedTransformations = pipeline.transformations.filter(t => t.id !== id);
    
    const updatedPipeline = {
      ...pipeline,
      transformations: updatedTransformations
    };

    setPipeline(updatedPipeline);
    onChange({ 
      ...config, 
      transformations: updatedTransformations,
      metadata: updatedPipeline.metadata 
    });

    if (selectedTransformation === id) {
      setSelectedTransformation(null);
    }
  };

  // Get transformation type icon
  const getTransformationIcon = (type: string) => {
    switch (type) {
      case 'map': return <Shuffle className="w-4 h-4" />;
      case 'filter': return <Filter className="w-4 h-4" />;
      case 'aggregate': return <Database className="w-4 h-4" />;
      case 'format': return <Code className="w-4 h-4" />;
      case 'extract': return <Target className="w-4 h-4" />;
      case 'enrich': return <Zap className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="transformations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transformations">Transformations</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Transformations Tab */}
        <TabsContent value="transformations" className="space-y-4">
          {/* Add Transformation Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Transformation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: 'map', label: 'Map Fields', icon: <Shuffle className="w-4 h-4" /> },
                  { type: 'filter', label: 'Filter Data', icon: <Filter className="w-4 h-4" /> },
                  { type: 'format', label: 'Format Values', icon: <Code className="w-4 h-4" /> },
                  { type: 'aggregate', label: 'Aggregate', icon: <Database className="w-4 h-4" /> },
                  { type: 'extract', label: 'Extract Fields', icon: <Target className="w-4 h-4" /> },
                  { type: 'enrich', label: 'Enrich Data', icon: <Zap className="w-4 h-4" /> },
                ].map(({ type, label, icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => addTransformation(type as DataTransformation['type'])}
                    className="flex flex-col items-center h-16 p-2"
                  >
                    {icon}
                    <span className="text-xs mt-1">{label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transformation List */}
          <div className="space-y-3">
            {pipeline.transformations.map((transformation, index) => (
              <Card 
                key={transformation.id} 
                className={`transition-all ${selectedTransformation === transformation.id ? 'ring-2 ring-blue-500' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getTransformationIcon(transformation.type)}
                        <Badge variant="outline">{transformation.type}</Badge>
                      </div>
                      <span className="text-sm font-medium">
                        Step {index + 1}
                      </span>
                      <Switch
                        checked={transformation.enabled}
                        onCheckedChange={(enabled) => 
                          updateTransformation(transformation.id, { enabled })
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => 
                          setSelectedTransformation(
                            selectedTransformation === transformation.id ? null : transformation.id
                          )
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTransformation(transformation.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {selectedTransformation === transformation.id && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      {transformation.type === 'map' && (
                        <>
                          <div>
                            <Label>Source Field</Label>
                            <Input
                              value={transformation.sourceField || ''}
                              onChange={(e) => 
                                updateTransformation(transformation.id, { sourceField: e.target.value })
                              }
                              placeholder="e.g., data.response.price"
                            />
                          </div>
                          <div>
                            <Label>Target Field</Label>
                            <Input
                              value={transformation.targetField || ''}
                              onChange={(e) => 
                                updateTransformation(transformation.id, { targetField: e.target.value })
                              }
                              placeholder="e.g., price"
                            />
                          </div>
                          <div>
                            <Label>Operation</Label>
                            <Select
                              value={transformation.operation}
                              onValueChange={(operation) => 
                                updateTransformation(transformation.id, { operation })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select operation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="copy">Copy</SelectItem>
                                <SelectItem value="rename">Move/Rename</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {transformation.type === 'filter' && (
                        <div className="col-span-2">
                          <Label>Filter Condition</Label>
                          <Textarea
                            value={transformation.condition || ''}
                            onChange={(e) => 
                              updateTransformation(transformation.id, { condition: e.target.value })
                            }
                            placeholder="e.g., data.price > 100"
                            className="font-mono"
                          />
                        </div>
                      )}

                      {transformation.type === 'format' && (
                        <>
                          <div>
                            <Label>Field</Label>
                            <Input
                              value={transformation.sourceField || ''}
                              onChange={(e) => 
                                updateTransformation(transformation.id, { sourceField: e.target.value })
                              }
                              placeholder="e.g., name"
                            />
                          </div>
                          <div>
                            <Label>Format Operation</Label>
                            <Select
                              value={transformation.operation}
                              onValueChange={(operation) => 
                                updateTransformation(transformation.id, { operation })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="uppercase">UPPERCASE</SelectItem>
                                <SelectItem value="lowercase">lowercase</SelectItem>
                                <SelectItem value="trim">Trim whitespace</SelectItem>
                                <SelectItem value="number">To number</SelectItem>
                                <SelectItem value="string">To string</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {pipeline.transformations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No transformations configured</h3>
              <p className="text-sm mb-4">Add transformations above to start processing your data</p>
            </div>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Data Preview</CardTitle>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showPreview}
                    onCheckedChange={setShowPreview}
                  />
                  <Label>Auto Preview</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePreview}
                    disabled={isPreviewLoading}
                  >
                    {isPreviewLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {previousBlockData ? (
                <div className="space-y-4">
                  {/* Input Data */}
                  <div>
                    <Label className="text-sm font-medium">Input Data</Label>
                    <pre className="mt-2 p-3 bg-gray-50 rounded-md text-sm overflow-auto max-h-40 border">
                      {JSON.stringify(previousBlockData, null, 2)}
                    </pre>
                  </div>

                  {/* Transformation Flow */}
                  {previewResult && (
                    <>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <ArrowRight className="w-4 h-4" />
                        <span>
                          {previewResult.metadata.transformationsApplied} transformations applied 
                          in {previewResult.metadata.executionTime}ms
                        </span>
                      </div>

                      {/* Output Data */}
                      <div>
                        <Label className="text-sm font-medium">
                          Transformed Output
                          <Badge variant="outline" className="ml-2">
                            {previewResult.success ? 'Success' : 'Failed'}
                          </Badge>
                        </Label>
                        <pre className={`mt-2 p-3 rounded-md text-sm overflow-auto max-h-40 border ${
                          previewResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          {JSON.stringify(previewResult.data, null, 2)}
                        </pre>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-blue-500" />
                          <span>
                            {previewResult.metadata.transformationsApplied} applied
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Database className="w-4 h-4 text-green-500" />
                          <span>
                            {Math.round(previewResult.metadata.dataSize.input / 1024 * 100) / 100}KB → 
                            {Math.round(previewResult.metadata.dataSize.output / 1024 * 100) / 100}KB
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4 text-purple-500" />
                          <span>{previewResult.metadata.executionTime}ms</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No input data available</p>
                  <p className="text-sm">Connect this block to see preview</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pipeline Name</Label>
                <Input
                  value={pipeline.metadata?.name || ''}
                  onChange={(e) => {
                    const updatedPipeline = {
                      ...pipeline,
                      metadata: {
                        ...pipeline.metadata!,
                        name: e.target.value
                      }
                    };
                    setPipeline(updatedPipeline);
                    onChange({ ...config, metadata: updatedPipeline.metadata });
                  }}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={pipeline.metadata?.description || ''}
                  onChange={(e) => {
                    const updatedPipeline = {
                      ...pipeline,
                      metadata: {
                        ...pipeline.metadata!,
                        description: e.target.value
                      }
                    };
                    setPipeline(updatedPipeline);
                    onChange({ ...config, metadata: updatedPipeline.metadata });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Button */}
      {onTest && (
        <div className="flex justify-end">
          <Button onClick={onTest}>
            <Play className="w-4 h-4 mr-2" />
            Test Pipeline
          </Button>
        </div>
      )}
    </div>
  );
}