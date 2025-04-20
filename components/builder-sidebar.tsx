"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BlockCatalog } from "@/components/block-catalog"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Settings, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Node } from "@/components/flow-canvas"

interface BuilderSidebarProps {
  onAddNode: (block: any, position?: { x: number; y: number }) => void
  workflowName: string
  workflowDescription: string
  onWorkflowDetailsChange: (details: { name?: string; description?: string }) => void
  nodes: Node[]
}

export function BuilderSidebar({
  onAddNode,
  workflowName,
  workflowDescription,
  onWorkflowDetailsChange,
  nodes,
}: BuilderSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("blocks")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-12" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.h2
              className="text-lg font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Builder
            </motion.h2>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!isCollapsed ? (
          <motion.div
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Tabs defaultValue="blocks" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 mx-4 mt-4">
                <TabsTrigger value="blocks">Blocks</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="blocks" className="flex-1 p-0">
                <BlockCatalog onAddNode={onAddNode} />
              </TabsContent>

              <TabsContent value="settings" className="flex-1 p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workflow-name">Workflow Name</Label>
                      <Input
                        id="workflow-name"
                        value={workflowName}
                        onChange={(e) => onWorkflowDetailsChange({ name: e.target.value })}
                        placeholder="Enter workflow name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workflow-description">Description</Label>
                      <Textarea
                        id="workflow-description"
                        value={workflowDescription}
                        onChange={(e) => onWorkflowDetailsChange({ description: e.target.value })}
                        placeholder="Describe what this workflow does"
                        rows={4}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Workflow Statistics</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground">Nodes</div>
                          <div className="text-lg font-semibold">{nodes.length}</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground">Triggers</div>
                          <div className="text-lg font-semibold">
                            {nodes.filter((node) => node.data?.nodeType === "trigger").length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            className="flex-1 flex flex-col items-center pt-4 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveTab("blocks")}
              aria-label="Blocks"
              data-state={activeTab === "blocks" ? "active" : "inactive"}
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveTab("settings")}
              aria-label="Settings"
              data-state={activeTab === "settings" ? "active" : "inactive"}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
