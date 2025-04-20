"use client";

import type React from "react";
import { useState } from "react";
import { BlockCatalog } from "@/components/block-catalog";
import { CustomBlockCatalog } from "@/components/custom-block-catalog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Workflow,
  Blocks,
  PuzzleIcon as PuzzlePiece,
  ChevronRight,
  BarChart3,
  Clock,
  Calendar,
  Settings,
} from "lucide-react";
import type { BlockType } from "@/types/workflow";
import type { Node } from "@/components/flow-canvas";
import type { CustomBlockDefinition } from "@/types/custom-block";

interface BuilderSidebarProps {
  onAddNode: (
    blockType: BlockType,
    position?: { x: number; y: number }
  ) => void;
  onAddCustomBlock?: (
    customBlock: CustomBlockDefinition,
    position?: { x: number; y: number }
  ) => void;
  workflowName: string;
  workflowDescription: string;
  onWorkflowDetailsChange: (details: {
    name?: string;
    description?: string;
  }) => void;
  nodes: Node[];
}

export function BuilderSidebar({
  onAddNode,
  onAddCustomBlock,
  workflowName,
  workflowDescription,
  onWorkflowDetailsChange,
  nodes,
}: BuilderSidebarProps) {
  const [mainTab, setMainTab] = useState("blocks");
  const [blockCatalogTab, setBlockCatalogTab] = useState("blocks");

  // Handle drag start from the catalog
  const handleDragStart = (
    event: React.DragEvent,
    blockType: BlockType,
    blockData: any
  ) => {
    console.log("Drag started:", blockType, blockData);
  };

  // Calculate some example stats
  const executionTime =
    nodes.length > 0 ? `${(nodes.length * 0.5).toFixed(1)}s` : "N/A";
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <div className='h-full flex flex-col bg-background border-r'>
      {/* Sidebar Header */}
      <div className='p-4 border-b bg-muted/30'>
        <div className='flex items-center gap-2 mb-1'>
          <Workflow className='h-5 w-5 text-primary' />
          <h2 className='font-semibold text-lg'>Workflow Builder</h2>
        </div>
        <p className='text-xs text-muted-foreground'>
          Design and configure your automation workflow
        </p>
      </div>

      {/* Main Tabs */}
      <div className='border-b'>
        <Tabs value={mainTab} onValueChange={setMainTab} className='w-full'>
          <TabsList className='w-full h-12'>
            <TabsTrigger
              value='blocks'
              className='flex-1 flex items-center gap-2'>
              <Blocks className='h-4 w-4' />
              <span>Blocks</span>
            </TabsTrigger>
            <TabsTrigger
              value='settings'
              className='flex-1 flex items-center gap-2'>
              <Settings className='h-4 w-4' />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger
              value='stats'
              className='flex-1 flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              <span>Stats</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className='flex-1 overflow-hidden'>
        {mainTab === "blocks" && (
          <div className='flex flex-col h-full'>
            <div className='p-4 border-b'>
              <div className='flex items-center gap-2 mb-3'>
                <PuzzlePiece className='h-4 w-4 text-primary' />
                <h3 className='font-medium'>Block Catalog</h3>
              </div>

              <Tabs value={blockCatalogTab} onValueChange={setBlockCatalogTab}>
                <TabsList className='w-full grid grid-cols-2 h-9'>
                  <TabsTrigger value='blocks' className='text-xs'>
                    Standard Blocks
                  </TabsTrigger>
                  <TabsTrigger value='custom' className='text-xs'>
                    Custom Blocks
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className='flex-1 overflow-hidden'>
              {blockCatalogTab === "blocks" && (
                <ScrollArea className='h-full'>
                  <div className='p-4 pt-2'>
                    <div className='text-xs text-muted-foreground mb-3 flex items-center'>
                      <ChevronRight className='h-3 w-3 mr-1' />
                      <span>Drag blocks to the canvas or click to add</span>
                    </div>
                    <BlockCatalog
                      onDragStart={handleDragStart}
                      onAddBlock={onAddNode}
                    />
                  </div>
                </ScrollArea>
              )}

              {blockCatalogTab === "custom" && (
                <ScrollArea className='h-full'>
                  <div className='p-4 pt-2'>
                    <div className='text-xs text-muted-foreground mb-3 flex items-center'>
                      <ChevronRight className='h-3 w-3 mr-1' />
                      <span>Your custom workflow blocks</span>
                    </div>
                    <CustomBlockCatalog onAddBlock={onAddCustomBlock} />
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {mainTab === "settings" && (
          <ScrollArea className='h-full'>
            <div className='p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <LayoutDashboard className='h-4 w-4 text-primary' />
                <h3 className='font-medium'>Workflow Details</h3>
              </div>

              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label
                    htmlFor='workflow-name'
                    className='text-xs font-medium'>
                    Name
                  </Label>
                  <Input
                    id='workflow-name'
                    value={workflowName}
                    onChange={(e) =>
                      onWorkflowDetailsChange({ name: e.target.value })
                    }
                    placeholder='Enter workflow name'
                    className='h-9 text-sm'
                  />
                </div>
                <div className='space-y-2'>
                  <Label
                    htmlFor='workflow-description'
                    className='text-xs font-medium'>
                    Description
                  </Label>
                  <Textarea
                    id='workflow-description'
                    value={workflowDescription}
                    onChange={(e) =>
                      onWorkflowDetailsChange({ description: e.target.value })
                    }
                    placeholder='Enter workflow description'
                    rows={3}
                    className='text-sm resize-none min-h-[80px]'
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {mainTab === "stats" && (
          <ScrollArea className='h-full'>
            <div className='p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <BarChart3 className='h-4 w-4 text-primary' />
                <h3 className='font-medium'>Workflow Stats</h3>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <Card className='bg-muted/30 border shadow-sm'>
                  <CardContent className='p-3 flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-muted-foreground'>Nodes</p>
                      <p className='text-lg font-semibold'>{nodes.length}</p>
                    </div>
                    <Blocks className='h-8 w-8 text-muted-foreground/50' />
                  </CardContent>
                </Card>

                <Card className='bg-muted/30 border shadow-sm'>
                  <CardContent className='p-3 flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        Est. Runtime
                      </p>
                      <p className='text-lg font-semibold'>{executionTime}</p>
                    </div>
                    <Clock className='h-8 w-8 text-muted-foreground/50' />
                  </CardContent>
                </Card>

                <Card className='bg-muted/30 border shadow-sm col-span-2'>
                  <CardContent className='p-3 flex items-center justify-between'>
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        Last Updated
                      </p>
                      <p className='text-sm font-medium'>{lastUpdated}</p>
                    </div>
                    <Calendar className='h-6 w-6 text-muted-foreground/50' />
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
