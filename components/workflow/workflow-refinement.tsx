"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import type { Node, Edge } from "@/components/flow-canvas";

export interface RefinementOptions {
  mode: "all" | "selected" | "missing";
  selectedNodes: string[];
  preserveConnections: boolean;
}

interface WorkflowRefinementProps {
  nodes: Node[];
  edges: Edge[];
  onRefine: (prompt: string, options: RefinementOptions) => Promise<void>;
  isRefining: boolean;
  onClose: () => void;
}

export const WorkflowRefinement: React.FC<WorkflowRefinementProps> = ({
  nodes,
  edges,
  onRefine,
  isRefining,
  onClose,
}) => {
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [preserveConnections, setPreserveConnections] = useState(true);
  const [mode, setMode] = useState<"all" | "selected" | "missing">("all");
  const [recentAttempts, setRecentAttempts] = useState<number>(0);
  const { toast } = useToast();

  const handleNodeToggle = (nodeId: string) => {
    setSelectedNodes((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const handleRefine = async () => {
    if (!refinementPrompt.trim() || isRefining) return;
    
    // Rate limiting check
    if (recentAttempts >= 3) {
      toast({
        title: "Rate limit exceeded",
        description: "Please wait before making more refinement requests.",
        variant: "destructive",
      });
      return;
    }
    
    setRecentAttempts(prev => prev + 1);
    
    try {
      // Track refinement for analytics
      try {
        if (typeof window !== 'undefined' && window.posthog) {
          window.posthog.capture('workflow_refined', {
            mode,
            selectedNodesCount: selectedNodes.length,
            promptLength: refinementPrompt.length,
            totalNodes: nodes.length,
          });
        }
      } catch (analyticsError) {
        console.warn('Analytics error:', analyticsError);
      }
      
      await onRefine(refinementPrompt, {
        mode,
        selectedNodes,
        preserveConnections,
      });
    } catch (error) {
      console.error("Error during refinement:", error);
      
      toast({
        title: "Refinement failed",
        description: error instanceof Error
          ? error.message
          : "Failed to refine workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Group nodes by type for better organization
  const nodesByType = nodes.reduce<Record<string, Node[]>>((acc, node) => {
    const type = node.data.blockType || "UNKNOWN";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(node);
    return acc;
  }, {});

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Refine Your Workflow</CardTitle>
        <CardDescription>
          Not quite what you wanted? Describe what should be changed or added.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="all">Entire Workflow</TabsTrigger>
            <TabsTrigger value="selected">Selected Nodes</TabsTrigger>
            <TabsTrigger value="missing">Add Components</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe changes for the entire workflow. The AI will try to
              adjust the workflow while preserving its overall structure.
            </p>
            <Textarea
              placeholder="How should the entire workflow be changed? (e.g., 'Make it check price every 30 minutes instead of hourly')"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </TabsContent>

          <TabsContent value="selected" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select specific nodes to modify, then describe the changes needed.
            </p>
            
            <div className="border rounded-md">
              <ScrollArea className="h-[200px] p-3">
                {Object.entries(nodesByType).map(([type, typeNodes]) => (
                  <div key={type} className="mb-3">
                    <h4 className="text-xs font-medium mb-1">
                      {type.replace(/_/g, " ")}
                    </h4>
                    <div className="space-y-2">
                      {typeNodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-start space-x-2"
                        >
                          <Checkbox
                            id={`node-${node.id}`}
                            checked={selectedNodes.includes(node.id)}
                            onCheckedChange={() => handleNodeToggle(node.id)}
                          />
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`node-${node.id}`}
                              className="font-medium text-sm cursor-pointer"
                            >
                              {node.data.label}
                            </Label>
                            {node.data.description && (
                              <p className="text-xs text-muted-foreground">
                                {node.data.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserve-connections"
                checked={preserveConnections}
                onCheckedChange={(checked) =>
                  setPreserveConnections(checked as boolean)
                }
              />
              <Label htmlFor="preserve-connections">
                Preserve connections to other nodes
              </Label>
            </div>

            <Textarea
              placeholder="Describe changes for the selected components"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              className="min-h-[100px]"
              disabled={selectedNodes.length === 0}
            />
            
            {selectedNodes.length === 0 && (
              <p className="text-sm text-amber-500">
                Please select at least one node to modify
              </p>
            )}
          </TabsContent>

          <TabsContent value="missing" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe what's missing from the workflow and the AI will attempt to
              add it while preserving the existing components.
            </p>
            <Textarea
              placeholder="Describe what's missing from the workflow (e.g., 'Add a step to log transactions to a database')"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </TabsContent>
        </Tabs>

        {/* Rate limit indicator */}
        {recentAttempts > 0 && (
          <div className="px-2 py-1 text-xs text-muted-foreground border-l-2 border-primary/20 pl-3">
            <p>Refinement attempts: {recentAttempts}/3</p>
            <p>Too many requests may result in rate limiting.</p>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isRefining}>
            Cancel
          </Button>
          <Button
            onClick={handleRefine}
            disabled={
              isRefining ||
              !refinementPrompt.trim() ||
              (mode === "selected" && selectedNodes.length === 0) ||
              recentAttempts >= 3
            }
          >
            {isRefining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Apply Refinements
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowRefinement;
