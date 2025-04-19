"use client"

import type React from "react"

import { useState } from "react"
import { BlockCatalog } from "@/components/block-catalog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, ChevronRight, HelpCircle, Settings, Sparkles } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BuilderSidebarProps {
  onAddNode: (block: any) => void
  workflowName?: string
  workflowDescription?: string
  onWorkflowDetailsChange?: (details: { name?: string; description?: string }) => void
}

export function BuilderSidebar({
  onAddNode,
  workflowName = "",
  workflowDescription = "",
  onWorkflowDetailsChange,
}: BuilderSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("blocks")

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onWorkflowDetailsChange?.({ name: e.target.value })
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onWorkflowDetailsChange?.({ description: e.target.value })
  }

  if (isCollapsed) {
    return (
      <div className="flex h-full w-12 flex-col border-r bg-background">
        <div className="flex h-14 items-center justify-center border-b">
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center py-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === "blocks" ? "secondary" : "ghost"}
                  size="icon"
                  className="mb-2"
                  onClick={() => {
                    setActiveTab("blocks")
                    setIsCollapsed(false)
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Blocks</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === "settings" ? "secondary" : "ghost"}
                  size="icon"
                  className="mb-2"
                  onClick={() => {
                    setActiveTab("settings")
                    setIsCollapsed(false)
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === "help" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => {
                    setActiveTab("help")
                    setIsCollapsed(false)
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Help</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-80 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="text-sm font-medium">Workflow Builder</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-3">
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks" className="flex-1 p-0">
          <BlockCatalog onAddNode={onAddNode} />
        </TabsContent>
        <TabsContent value="settings" className="flex-1 p-0 data-[state=active]:flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input id="workflow-name" placeholder="My Workflow" value={workflowName} onChange={handleNameChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  placeholder="Describe what this workflow does..."
                  value={workflowDescription}
                  onChange={handleDescriptionChange}
                  rows={4}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Workflow Settings</h3>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Additional workflow settings will be available in a future update.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="help" className="flex-1 p-0 data-[state=active]:flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Getting Started</h3>
                <div className="rounded-md border p-4 space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">1. Add blocks to your canvas</h4>
                    <p className="text-sm text-muted-foreground">
                      Drag blocks from the sidebar onto the canvas to build your workflow.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">2. Connect your blocks</h4>
                    <p className="text-sm text-muted-foreground">
                      Click and drag from one block's output to another block's input to create connections.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">3. Configure each block</h4>
                    <p className="text-sm text-muted-foreground">
                      Click on a block to open its configuration panel and set up its parameters.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">4. Save and run your workflow</h4>
                    <p className="text-sm text-muted-foreground">
                      Once your workflow is complete, save it and run it to see it in action.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Keyboard Shortcuts</h3>
                <div className="rounded-md border p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Delete selected</span>
                    <span className="text-sm font-mono text-muted-foreground">Delete / Backspace</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Copy selected</span>
                    <span className="text-sm font-mono text-muted-foreground">Ctrl+C / ⌘+C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Paste</span>
                    <span className="text-sm font-mono text-muted-foreground">Ctrl+V / ⌘+V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Undo</span>
                    <span className="text-sm font-mono text-muted-foreground">Ctrl+Z / ⌘+Z</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Redo</span>
                    <span className="text-sm font-mono text-muted-foreground">Ctrl+Shift+Z / ⌘+Shift+Z</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
