"use client";

import { useState, useEffect } from "react";
import type { Edge } from "@xyflow/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [color, setColor] = useState(edge.style?.stroke || "#64748b");
  const [isAnimated, setIsAnimated] = useState(edge.animated || false);
  const [edgeType, setEdgeType] = useState(edge.type || "custom");
  const [labelVisible, setLabelVisible] = useState(edge.labelVisible !== false);

  useEffect(() => {
    setLabel(edge.label || "");
    setColor(edge.style?.stroke || "#64748b");
    setIsAnimated(edge.animated || false);
    setEdgeType(edge.type || "custom");
    setLabelVisible(edge.labelVisible !== false);
  }, [edge]);

  const handleSave = () => {
    onUpdate({
      ...edge,
      label,
      animated: isAnimated,
      labelVisible,
      type: edgeType,
      style: {
        ...edge.style,
        stroke: color,
      },
      data: {
        ...edge.data,
        label,
      },
    });
  };

  return (
    <Card className='w-80 border-l-0 rounded-l-none h-full max-h-full flex flex-col'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-semibold'>
            Connection Settings
          </CardTitle>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
        <CardDescription>Configure connection properties</CardDescription>
      </CardHeader>
      <Separator />
      <ScrollArea className='flex-1'>
        <CardContent className='pt-4 space-y-6'>
          <div className='space-y-2'>
            <Label htmlFor='edge-label'>Label</Label>
            <Input
              id='edge-label'
              placeholder='Connection label'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleSave}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edge-color'>Color</Label>
            <div className='flex items-center gap-2'>
              <Input
                id='edge-color'
                type='color'
                value={color}
                className='w-12 h-9 p-1'
                onChange={(e) => setColor(e.target.value)}
                onBlur={handleSave}
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={handleSave}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edge-type'>Connection Type</Label>
            <Select
              value={edgeType}
              onValueChange={(value) => {
                setEdgeType(value);
                handleSave();
              }}>
              <SelectTrigger id='edge-type'>
                <SelectValue placeholder='Select type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='custom'>Default</SelectItem>
                <SelectItem value='step'>Step</SelectItem>
                <SelectItem value='smoothstep'>Smooth Step</SelectItem>
                <SelectItem value='straight'>Straight</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='edge-animated'>Animated</Label>
            <Switch
              id='edge-animated'
              checked={isAnimated}
              onCheckedChange={(checked) => {
                setIsAnimated(checked);
                handleSave();
              }}
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='label-visible'>Show Label</Label>
            <Switch
              id='label-visible'
              checked={labelVisible}
              onCheckedChange={(checked) => {
                setLabelVisible(checked);
                handleSave();
              }}
            />
          </div>
        </CardContent>
      </ScrollArea>
      <Separator />
      <CardFooter className='flex justify-end pt-4'>
        <Button variant='outline' onClick={onClose} className='mr-2'>
          Close
        </Button>
      </CardFooter>
    </Card>
  );
}
