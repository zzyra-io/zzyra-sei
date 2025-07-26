"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Edge } from "@xyflow/react";
import { X, Link, Zap, Plus, ArrowUpDown, Eye, EyeOff, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TransformationTemplateSelector } from "@/components/transformation-template-selector";

interface EdgeConfigPanelProps {
  edge: Edge;
  onUpdate: (edge: Edge) => void;
  onClose: () => void;
  sourceBlock?: any;
  targetBlock?: any;
}

interface FieldMapping {
  targetField: string;
  sourceField: string;
  transformationType?: 'direct' | 'format' | 'calculate' | 'conditional';
  transformConfig?: Record<string, any>;
}

interface DataTransformation {
  type: 'map' | 'filter' | 'aggregate' | 'format' | 'extract' | 'combine' | 'conditional' | 'loop' | 'sort';
  field: string;
  operation: string;
  value?: any;
  outputField: string;
  condition?: string;
}

export function EdgeConfigPanel({
  edge,
  onUpdate,
  onClose,
  sourceBlock,
  targetBlock,
}: EdgeConfigPanelProps) {
  const [label, setLabel] = useState(edge.label || "");
  const [color, setColor] = useState(edge.style?.stroke || "#000000");
  const [edgeType, setEdgeType] = useState(edge.type || "custom");
  const [strokeStyle, setStrokeStyle] = useState(
    edge.style?.strokeDasharray ? "dashed" : "solid"
  );
  const [width, setWidth] = useState(edge.style?.strokeWidth || 2);
  const [animated, setAnimated] = useState(edge.animated || false);

  // Data flow configuration
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(
    (edge.data?.fieldMappings as FieldMapping[]) || []
  );
  const [transformations, setTransformations] = useState<DataTransformation[]>(
    (edge.data?.transformations as DataTransformation[]) || []
  );
  const [transformCode, setTransformCode] = useState(
    edge.data?.transform || ""
  );
  const [condition, setCondition] = useState(edge.data?.condition || "");
  const [dataType, setDataType] = useState(edge.data?.dataType || "all");
  
  // Advanced transformation states
  const [activeTransformTab, setActiveTransformTab] = useState("structured");
  const [showPreview, setShowPreview] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [debouncedTransformations] = useDebounce(transformations, 500);

  useEffect(() => {
    setLabel(edge.label || "");
    setColor(edge.style?.stroke || "#000000");
    setEdgeType(edge.type || "custom");
    setStrokeStyle(edge.style?.strokeDasharray ? "dashed" : "solid");
    setWidth(edge.style?.strokeWidth || 2);
    setAnimated(edge.animated || false);
    setFieldMappings((edge.data?.fieldMappings as FieldMapping[]) || []);
    setTransformations((edge.data?.transformations as DataTransformation[]) || []);
    setTransformCode(edge.data?.transform || "");
    setCondition(edge.data?.condition || "");
    setDataType(edge.data?.dataType || "all");
  }, [edge]);

  const handleSave = () => {
    const updatedEdge: Edge = {
      ...edge,
      label,
      type: edgeType,
      style: {
        ...edge.style,
        stroke: color,
        strokeWidth: width,
        strokeDasharray: strokeStyle === 'dashed' ? '5,5' : strokeStyle === 'dotted' ? '2,2' : undefined,
      },
      animated,
      data: {
        ...edge.data,
        fieldMappings: fieldMappings.length > 0 ? fieldMappings : undefined,
        transformations: transformations.length > 0 ? transformations : undefined,
        transform: transformCode || undefined,
        condition: condition || undefined,
        dataType,
      },
    };
    onUpdate(updatedEdge);
  };

  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, { 
      targetField: "", 
      sourceField: "",
      transformationType: 'direct',
      transformConfig: {}
    }]);
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateFieldMapping = (
    index: number,
    field: keyof FieldMapping,
    value: any
  ) => {
    const updated = [...fieldMappings];
    updated[index] = { ...updated[index], [field]: value };
    setFieldMappings(updated);
    handleSave();
  };

  // Advanced transformation functions
  const addTransformation = () => {
    const newTransform: DataTransformation = {
      type: "map",
      field: "",
      operation: "",
      value: "",
      outputField: "",
    };
    const updated = [...transformations, newTransform];
    setTransformations(updated);
    handleSave();
  };

  const removeTransformation = (index: number) => {
    const updated = transformations.filter((_, i) => i !== index);
    setTransformations(updated);
    handleSave();
  };

  const updateTransformation = (index: number, field: string, value: any) => {
    const updated = transformations.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    setTransformations(updated);
    handleSave();
  };

  // Generate preview data using API
  const generatePreview = useCallback(async () => {
    if (!sourceBlock?.data || debouncedTransformations.length === 0) {
      setPreviewData(null);
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
          data: sourceBlock.data,
          transformations: debouncedTransformations
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewData(result.data);
        setValidationErrors([]);
      } else {
        throw new Error('Preview generation failed');
      }
    } catch (error: any) {
      console.error('Preview generation error:', error);
      setValidationErrors([error.message]);
    } finally {
      setPreviewLoading(false);
    }
  }, [sourceBlock?.data, debouncedTransformations]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);


  return (
    <Card className='w-96 border-l-0 rounded-l-none h-full max-h-full flex flex-col bg-background/95 backdrop-blur-sm'>
      <CardHeader className='pb-4 border-b border-border/50'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center'>
              <Link className='w-4 h-4 text-primary' />
            </div>
            <div>
              <CardTitle className='text-lg font-semibold'>
                Connection Settings
              </CardTitle>
              <CardDescription className='text-sm text-muted-foreground'>
                Configure data flow between blocks
              </CardDescription>
            </div>
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={onClose}
            className='h-8 w-8'>
            <X className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className='flex-1'>
        <CardContent className='pt-6'>
          <Tabs defaultValue='visual' className='w-full'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='visual'>Visual</TabsTrigger>
              <TabsTrigger value='data'>Data Flow</TabsTrigger>
              <TabsTrigger value='transform'>Transform</TabsTrigger>
              <TabsTrigger value='condition'>Condition</TabsTrigger>
            </TabsList>

            <TabsContent value='visual' className='space-y-4'>
              <div className='space-y-3'>
                <Label htmlFor='edge-label' className='text-sm font-medium'>
                  Connection Label
                </Label>
                <Input
                  id='edge-label'
                  placeholder='Enter connection label'
                  value={label as string}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={handleSave}
                  className='h-11'
                />
              </div>

              <div className='space-y-3'>
                <Label htmlFor='edge-color' className='text-sm font-medium'>
                  Connection Color
                </Label>
                <div className='flex items-center gap-3'>
                  <Input
                    id='edge-color'
                    type='color'
                    value={color}
                    className='w-12 h-11 p-1 rounded-lg border border-border'
                    onChange={(e) => setColor(e.target.value)}
                    onBlur={handleSave}
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    onBlur={handleSave}
                    className='h-11 flex-1'
                    placeholder='#000000'
                  />
                </div>
              </div>

              <div className='space-y-3'>
                <Label htmlFor='edge-style' className='text-sm font-medium'>
                  Connection Style
                </Label>
                <Select
                  value={strokeStyle}
                  onValueChange={(value) => setStrokeStyle(value)}>
                  <SelectTrigger id='edge-style' className='h-11'>
                    <SelectValue placeholder='Select style' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='solid'>Solid</SelectItem>
                    <SelectItem value='dashed'>Dashed</SelectItem>
                    <SelectItem value='dotted'>Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-3'>
                <Label htmlFor='edge-width' className='text-sm font-medium'>
                  Connection Width
                </Label>
                <div className='flex items-center space-x-3'>
                  <input
                    id='edge-width'
                    type='range'
                    min='1'
                    max='10'
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    onBlur={handleSave}
                    className='flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer'
                    title='Connection width'
                    aria-label='Connection width'
                  />
                  <span className='text-sm text-muted-foreground min-w-[2rem] text-center'>
                    {width}px
                  </span>
                </div>
              </div>

              <div className='flex items-center space-x-3 p-3 bg-muted/30 rounded-lg'>
                <Switch
                  id='animated'
                  checked={animated}
                  onCheckedChange={(checked) => setAnimated(checked)}
                />
                <Label htmlFor='animated' className='text-sm font-medium'>
                  Animated connection
                </Label>
              </div>
            </TabsContent>

            <TabsContent value='data' className='space-y-4'>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label className='text-sm font-medium'>Data Type</Label>
                  <Badge variant='outline'>{dataType as string}</Badge>
                </div>
                <Select value={dataType as string} onValueChange={setDataType}>
                  <SelectTrigger className='h-11'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Data</SelectItem>
                    <SelectItem value='mapped'>Mapped Fields Only</SelectItem>
                    <SelectItem value='filtered'>Filtered Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label className='text-sm font-medium'>Field Mapping</Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addFieldMapping}>
                    Add Mapping
                  </Button>
                </div>

                <div className='space-y-2'>
                  {fieldMappings.map((mapping, index) => (
                    <React.Fragment key={index}>
                    <div
                      className='flex items-center gap-2 p-2 border rounded-lg'>
                      <div className='flex-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Source
                        </Label>
                        <Input
                          value={mapping.sourceField}
                          onChange={(e) => updateFieldMapping(index, "sourceField", e.target.value)}
                          placeholder='e.g., data.response'
                          className='h-8 text-xs'
                        />
                      </div>
                      <div className='flex items-center'>
                        <Zap className='w-4 h-4 text-muted-foreground' />
                      </div>
                      <div className='flex-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Target
                        </Label>
                        <Input
                          value={mapping.targetField}
                          onChange={(e) => updateFieldMapping(index, "targetField", e.target.value)}
                          placeholder='e.g., input'
                          className='h-8 text-xs'
                        />
                      </div>
                      <div className='flex-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Transform
                        </Label>
                        <Select
                          value={mapping.transformationType || 'direct'}
                          onValueChange={(value) => updateFieldMapping(index, "transformationType", value)}>
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='direct'>Direct</SelectItem>
                            <SelectItem value='format'>Format</SelectItem>
                            <SelectItem value='calculate'>Calculate</SelectItem>
                            <SelectItem value='conditional'>Conditional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => removeFieldMapping(index)}
                        className='h-8 w-8 p-0'>
                        <X className='w-4 h-4' />
                      </Button>
                    </div>
                    
                    {mapping.transformationType && mapping.transformationType !== 'direct' && (
                      <div className='ml-4 mt-2 p-2 bg-muted/20 rounded border-l-2 border-primary/20'>
                        <Input
                          value={JSON.stringify(mapping.transformConfig || {})}
                          onChange={(e) => {
                            try {
                              const config = JSON.parse(e.target.value);
                              updateFieldMapping(index, "transformConfig", config);
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          placeholder='{"operation": "uppercase"}'
                          className='h-8 text-xs font-mono'
                        />
                      </div>
                    )}
                    </React.Fragment>
                  ))}

                  {fieldMappings.length === 0 && (
                    <div className='text-center py-4 text-muted-foreground text-sm'>
                      No field mappings configured
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value='transform' className='space-y-4'>
              <Tabs value={activeTransformTab} onValueChange={setActiveTransformTab} className='w-full'>
                <TabsList className='grid w-full grid-cols-3'>
                  <TabsTrigger value='structured'>Structured</TabsTrigger>
                  <TabsTrigger value='templates'>Templates</TabsTrigger>
                  <TabsTrigger value='custom'>Custom Code</TabsTrigger>
                </TabsList>

                <TabsContent value='structured' className='space-y-4'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-sm font-medium'>Data Transformations</Label>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={addTransformation}>
                        <Plus className='w-4 h-4 mr-1' />
                        Add
                      </Button>
                    </div>

                    {transformations.length === 0 ? (
                      <div className='text-center py-4 text-muted-foreground text-sm'>
                        <ArrowUpDown className='w-8 h-8 mx-auto mb-2 opacity-50' />
                        <p>No transformations configured</p>
                      </div>
                    ) : (
                      <div className='space-y-2 max-h-48 overflow-y-auto'>
                        {transformations.map((transform, index) => (
                          <div key={index} className='p-2 border rounded-lg space-y-2'>
                            <div className='flex items-center justify-between'>
                              <Badge variant='outline' className='text-xs'>{transform.type}</Badge>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => removeTransformation(index)}
                                className='h-6 w-6 p-0'>
                                <X className='w-3 h-3' />
                              </Button>
                            </div>
                            
                            <div className='grid grid-cols-2 gap-2'>
                              <Select
                                value={transform.type}
                                onValueChange={(value) => updateTransformation(index, "type", value)}>
                                <SelectTrigger className='h-8 text-xs'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='map'>Map</SelectItem>
                                  <SelectItem value='filter'>Filter</SelectItem>
                                  <SelectItem value='format'>Format</SelectItem>
                                  <SelectItem value='aggregate'>Aggregate</SelectItem>
                                </SelectContent>
                              </Select>

                              <Input
                                value={transform.field || ""}
                                onChange={(e) => updateTransformation(index, "field", e.target.value)}
                                placeholder='Field name'
                                className='h-8 text-xs'
                              />
                            </div>

                            <Input
                              value={transform.operation || ""}
                              onChange={(e) => updateTransformation(index, "operation", e.target.value)}
                              placeholder='Operation (e.g., uppercase, multiply)'
                              className='h-8 text-xs'
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Preview Section */}
                    {sourceBlock && (
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <Label className='text-sm font-medium'>Preview</Label>
                          <div className='flex items-center space-x-1'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() => setShowPreview(!showPreview)}
                              className='h-7 px-2'>
                              {showPreview ? <EyeOff className='w-3 h-3' /> : <Eye className='w-3 h-3' />}
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={generatePreview}
                              disabled={previewLoading}
                              className='h-7 px-2'>
                              {previewLoading ? <Loader2 className='w-3 h-3 animate-spin' /> : <RefreshCw className='w-3 h-3' />}
                            </Button>
                          </div>
                        </div>

                        {showPreview && (
                          <div className='space-y-2'>
                            {previewLoading ? (
                              <div className='text-center py-2'>
                                <Loader2 className='w-4 h-4 mx-auto animate-spin text-blue-500' />
                              </div>
                            ) : previewData ? (
                              <pre className='p-2 bg-green-50 rounded text-xs overflow-auto max-h-24'>
                                {JSON.stringify(previewData, null, 2)}
                              </pre>
                            ) : (
                              <div className='text-center py-2 text-muted-foreground text-xs'>
                                No preview available
                              </div>
                            )}

                            {validationErrors.length > 0 && (
                              <Alert variant='destructive' className='py-2'>
                                <AlertCircle className='h-3 w-3' />
                                <AlertDescription className='text-xs'>
                                  {validationErrors[0]}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value='templates' className='space-y-4'>
                  <div className='space-y-3'>
                    <Label className='text-sm font-medium'>Transformation Templates</Label>
                    <TransformationTemplateSelector
                      onApplyTemplate={(templateTransformations) => {
                        const updated = [...transformations, ...templateTransformations];
                        setTransformations(updated);
                        handleSave();
                      }}
                      currentTransformations={transformations}
                    />
                  </div>
                </TabsContent>

                <TabsContent value='custom' className='space-y-4'>
                  <div className='space-y-3'>
                    <Label className='text-sm font-medium'>Custom JavaScript</Label>
                    <Textarea
                      placeholder='// Transform data before passing to target block
// Example: return { ...data, processed: true };'
                      value={transformCode as string}
                      onChange={(e) => setTransformCode(e.target.value)}
                      onBlur={handleSave}
                      className='min-h-[120px] font-mono text-sm'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Use JavaScript to transform data. The input data is available as the 'data' variable.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value='condition' className='space-y-4'>
              <div className='space-y-3'>
                <Label className='text-sm font-medium'>
                  Conditional Execution
                </Label>
                <Input
                  placeholder='data.price > 50000'
                  value={condition as string}
                  onChange={(e) => setCondition(e.target.value)}
                  className='font-mono text-sm'
                />
                <p className='text-xs text-muted-foreground'>
                  Only execute this connection if the condition is true. Use
                  JavaScript expressions.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
