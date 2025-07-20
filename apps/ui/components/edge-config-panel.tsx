"use client";

import { useState, useEffect } from "react";
import type { Edge } from "@xyflow/react";
import { X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "lucide-react";

interface EdgeConfigPanelProps {
  edge: Edge;
  onUpdate: (edge: Edge) => void;
  onClose: () => void;
}

export function EdgeConfigPanel({
  edge,
  onUpdate,
  onClose,
}: EdgeConfigPanelProps) {
  const [label, setLabel] = useState(edge.label || "");
  const [color, setColor] = useState(edge.style?.stroke || "#000000");
  const [edgeType, setEdgeType] = useState(edge.type || "custom");
  const [style, setStyle] = useState(edge.style?.stroke || "solid");
  const [width, setWidth] = useState(edge.style?.strokeWidth || 2);
  const [animated, setAnimated] = useState(edge.animated || false);

  useEffect(() => {
    setLabel(edge.label || "");
    setColor(edge.style?.stroke || "#000000");
    setEdgeType(edge.type || "custom");
    setStyle(edge.style?.stroke || "solid");
    setWidth(edge.style?.strokeWidth || 2);
    setAnimated(edge.animated || false);
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
      },
      data: {
        ...edge.data,
        animated,
      },
    };
    onUpdate(updatedEdge);
  };

  return (
    <Card className='w-80 border-l-0 rounded-l-none h-full max-h-full flex flex-col bg-background/95 backdrop-blur-sm'>
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
                Configure connection properties
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
        <CardContent className='pt-6 space-y-6'>
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
            <Select value={style} onValueChange={(value) => setStyle(value)}>
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
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
