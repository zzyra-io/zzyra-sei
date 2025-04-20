"use client"

import type React from "react"
import { useState } from "react"
import { BlockCatalog } from "@/components/block-catalog"
import { CustomBlockCatalog } from "@/components/custom-block-catalog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { BlockType } from "@/types/workflow"
import type { Node } from "@/components/flow-canvas"
import type { CustomBlockDefinition } from "@/types/custom-block"

interface BuilderSidebarProps {
  onAddNode: (blockType: BlockType, position?: { x: number; y: number }) => void
  onAddCustomBlock?: (customBlock: CustomBlockDefinition, position?: { x: number; y: number }) => void
  workflowName: string
  workflowDescription: string
  onWorkflowDetailsChange: (details: { name?: string; description?: string }) => void
  nodes: Node[]
}

export function BuilderSidebar({
  onAddNode,
  onAddCustomBlock,
  workflowName,
  workflowDescription,
  onWorkflowDetailsChange,
  nodes,
}: BuilderSidebarProps) {
  const [catalogTab, setCatalogTab] = useState("blocks")

  // Handle drag start from the catalog
  const handleDragStart = (event: React.DragEvent, blockType: BlockType, blockData: any) => {
    // This function is passed to BlockCatalog but the actual drag handling
    // is done within the BlockCatalog component itself
    console.log("Drag started:", blockType, blockData)
  }

  return (
    <div className="h-full flex flex-col bg-background border-r">
      <div className="p-4 border-b">
        <Card className="bg-background border-none shadow-none">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-lg">Workflow Details</CardTitle>
            <CardDescription>Configure your workflow properties</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => onWorkflowDetailsChange({ name: e.target.value })}
                placeholder="Enter workflow name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="workflow-description">Description</Label>
              <Textarea
                id="workflow-description"
                value={workflowDescription}
                onChange={(e) => onWorkflowDetailsChange({ description: e.target.value })}
                placeholder="Enter workflow description"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Workflow Stats</h3>
          <Badge variant="outline">{nodes.length} Nodes</Badge>
        </div>
      </div>

      <Tabs value={catalogTab} onValueChange={setCatalogTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="blocks" className="flex-1">
              Standard Blocks
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">
              Custom Blocks
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="blocks" className="m-0 p-0 h-full">
            <BlockCatalog onDragStart={handleDragStart} onAddBlock={onAddNode} />
          </TabsContent>

          <TabsContent value="custom" className="m-0 p-0 h-full">
            <CustomBlockCatalog onAddBlock={onAddCustomBlock} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
