"use client";

import { useState, useEffect } from "react";
import type { Edge } from "@xyflow/react";
import { X, Link, Settings, Code, Zap } from "lucide-react";
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
    edge.data?.mapping
      ? Object.entries(edge.data.mapping).map(([target, source]) => ({
          targetField: target,
          sourceField: source as string,
        }))
      : []
  );
  const [transformCode, setTransformCode] = useState(
    edge.data?.transform || ""
  );
  const [condition, setCondition] = useState(edge.data?.condition || "");
  const [dataType, setDataType] = useState(edge.data?.dataType || "all");

  useEffect(() => {
    setLabel(edge.label || "");
    setColor(edge.style?.stroke || "#000000");
    setEdgeType(edge.type || "custom");
    setStrokeStyle(edge.style?.strokeDasharray ? "dashed" : "solid");
    setWidth(edge.style?.strokeWidth || 2);
    setAnimated(edge.animated || false);
    setFieldMappings(
      edge.data?.mapping
        ? Object.entries(edge.data.mapping).map(([target, source]) => ({
            targetField: target,
            sourceField: source as string,
          }))
        : []
    );
    setTransformCode(edge.data?.transform || "");
    setCondition(edge.data?.condition || "");
    setDataType(edge.data?.dataType || "all");
  }, [edge]);

  const handleSave = () => {
    const mapping: Record<string, string> = {};
    fieldMappings.forEach(({ targetField, sourceField }) => {
      if (targetField && sourceField) {
        mapping[targetField] = sourceField;
      }
    });

    const updatedEdge: Edge = {
      ...edge,
      label,
      type: edgeType,
      style: {
        ...edge.style,
        stroke: color,
        strokeWidth: width,
      },
      data: {
        ...edge.data,
        animated,
        mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
        transform: transformCode || undefined,
        condition: condition || undefined,
        dataType,
      },
    };
    onUpdate(updatedEdge);
  };

  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, { targetField: "", sourceField: "" }]);
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateFieldMapping = (
    index: number,
    field: keyof FieldMapping,
    value: string
  ) => {
    const updated = [...fieldMappings];
    updated[index] = { ...updated[index], [field]: value };
    setFieldMappings(updated);
  };

  const getAvailableSourceFields = () => {
    if (!sourceBlock?.data?.outputs) return [];
    const outputs = sourceBlock.data.outputs;
    if (typeof outputs === "object" && outputs !== null) {
      return Object.keys(outputs);
    }
    return [];
  };

  const getAvailableTargetFields = () => {
    if (!targetBlock?.data?.inputs) return [];
    const inputs = targetBlock.data.inputs;
    if (typeof inputs === "object" && inputs !== null) {
      return Object.keys(inputs);
    }
    return [];
  };

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
                  value={label}
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
                  <Badge variant='outline'>{dataType}</Badge>
                </div>
                <Select value={dataType} onValueChange={setDataType}>
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
                    <div
                      key={index}
                      className='flex items-center gap-2 p-2 border rounded-lg'>
                      <div className='flex-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Source
                        </Label>
                        <Select
                          value={mapping.sourceField}
                          onValueChange={(value: string) =>
                            updateFieldMapping(index, "sourceField", value)
                          }>
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder='Select source field' />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableSourceFields().map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='flex items-center'>
                        <Zap className='w-4 h-4 text-muted-foreground' />
                      </div>
                      <div className='flex-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Target
                        </Label>
                        <Select
                          value={mapping.targetField}
                          onValueChange={(value: string) =>
                            updateFieldMapping(index, "targetField", value)
                          }>
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder='Select target field' />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTargetFields().map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
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
              <div className='space-y-3'>
                <Label className='text-sm font-medium'>
                  Data Transformation
                </Label>
                <Textarea
                  placeholder='// Transform data before passing to target block
// Example: return { ...data, processed: true };'
                  value={transformCode}
                  onChange={(e) => setTransformCode(e.target.value)}
                  className='min-h-[120px] font-mono text-sm'
                />
                <p className='text-xs text-muted-foreground'>
                  Use JavaScript to transform data. The input data is available
                  as the 'data' variable.
                </p>
              </div>
            </TabsContent>

            <TabsContent value='condition' className='space-y-4'>
              <div className='space-y-3'>
                <Label className='text-sm font-medium'>
                  Conditional Execution
                </Label>
                <Input
                  placeholder='data.price > 50000'
                  value={condition}
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
