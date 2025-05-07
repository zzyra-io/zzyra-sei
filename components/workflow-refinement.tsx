"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ZoomIn } from "lucide-react";
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
import type { Node, Edge } from "@/components/flow-canvas";

interface WorkflowRefinementProps {
  nodes: Node[];
  edges: Edge[];
  onRefine: (prompt: string, options: RefinementOptions) => void;
  isRefining: boolean;
  onClose: () => void;
}

export interface RefinementOptions {
  mode: "all" | "selected" | "missing";
  selectedNodes: string[];
  preserveConnections: boolean;
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

  const handleNodeToggle = (nodeId: string) => {
    setSelectedNodes((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const handleRefine = () => {
    if (!refinementPrompt.trim() || isRefining) return;

    onRefine(refinementPrompt, {
      mode,
      selectedNodes,
      preserveConnections,
    });
  };

  // Group nodes by type for better organization
  const nodesByType = nodes.reduce((acc, node) => {
    const type = node.data.blockType || "UNKNOWN";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(node);
    return acc;
  }, {} as Record<string, Node[]>);

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

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isRefining}>
            Cancel
          </Button>
          <Button
            onClick={handleRefine}
            disabled={
              isRefining ||
              !refinementPrompt.trim() ||
              (mode === "selected" && selectedNodes.length === 0)
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

// Node selector component for visual selection of workflow nodes
export const NodeSelector: React.FC<{
  nodes: Node[];
  selectedNodes: string[];
  onSelectionChange: (selected: string[]) => void;
}> = ({ nodes, selectedNodes, onSelectionChange }) => {
  return (
    <div className="node-selector border rounded-md p-3 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">Select Nodes to Modify</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectionChange([])}
          disabled={selectedNodes.length === 0}
        >
          Clear
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`border rounded p-2 cursor-pointer transition-colors ${
              selectedNodes.includes(node.id)
                ? "bg-primary/10 border-primary"
                : "hover:bg-accent"
            }`}
            onClick={() => {
              if (selectedNodes.includes(node.id)) {
                onSelectionChange(selectedNodes.filter((id) => id !== node.id));
              } else {
                onSelectionChange([...selectedNodes, node.id]);
              }
            }}
          >
            <div className="flex justify-between items-start">
              <span className="font-medium text-sm">{node.data.label}</span>
              <Badge variant="outline" className="text-xs">
                {node.data.blockType}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
