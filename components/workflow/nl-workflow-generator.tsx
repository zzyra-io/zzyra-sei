"use client";

import { useState, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Sparkles, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress"; 
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Node, Edge } from "@/components/flow-canvas";

// Type definitions
export interface GenerationOptions {
  detailedMode: boolean;
  prefillConfig: boolean;
  domainHint?: string;
}

export interface GenerationStatus {
  status: "idle" | "preparing" | "generating" | "finalizing" | "complete" | "error";
  progress: number;
  message?: string;
  error?: string;
}

interface NlWorkflowGeneratorProps {
  onNodesGenerated: (nodes: Node[], edges: Edge[]) => void;
  existingNodes?: Node[];
  existingEdges?: Edge[];
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  className?: string;
}

// Example suggestions by category
const SUGGESTION_CATEGORIES = {
  crypto: [
    "Monitor ETH price every hour and send email when it crosses $3000",
    "Buy 0.1 ETH on Uniswap when gas prices are below 30 gwei",
    "Track my wallet balance and notify me when it drops below $5000",
  ],
  email: [
    "Send a weekly summary of my portfolio performance every Monday at 9 AM",
    "Email my team when a new transaction over $10,000 is detected",
    "Alert me when my smart contract has more than 10 interactions in an hour",
  ],
  automation: [
    "Run a sentiment analysis on crypto news articles daily and summarize the results",
    "Create a backup of my transaction history every week",
    "Connect to Discord and post alerts when major price movements occur",
  ],
};

// Chip component for suggestions
const Chip = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="inline-flex items-center rounded-full border border-input bg-background px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
  >
    {children}
  </button>
);

// Simple domain detection
const detectDomain = (prompt: string): string | undefined => {
  const lowerPrompt = prompt.toLowerCase();
  
  if (/\b(crypto|bitcoin|eth|btc|blockchain|token|uniswap|defi)\b/.test(lowerPrompt)) {
    return "crypto";
  }
  
  if (/\b(email|send|message|notify|alert)\b/.test(lowerPrompt)) {
    return "communication";
  }
  
  return undefined;
};

export const NlWorkflowGenerator: React.FC<NlWorkflowGeneratorProps> = ({
  onNodesGenerated,
  existingNodes = [],
  existingEdges = [],
  isGenerating,
  setIsGenerating,
  className,
}) => {
  // State
  const [prompt, setPrompt] = useState<string>("");
  const [detailedMode, setDetailedMode] = useState<boolean>(true);
  const [prefillConfig, setPrefillConfig] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("crypto");
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [showExamplesPanel, setShowExamplesPanel] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    status: "idle",
    progress: 0,
  });
  const [partialNodes, setPartialNodes] = useState<Partial<Node>[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<number>(0);
  const { toast } = useToast();

  // Update suggestions when category changes
  useEffect(() => {
    setPromptSuggestions(
      SUGGESTION_CATEGORIES[selectedCategory as keyof typeof SUGGESTION_CATEGORIES] || []
    );
  }, [selectedCategory]);

  // Rate limit protection
  useEffect(() => {
    if (recentAttempts > 0) {
      const timer = setTimeout(() => {
        setRecentAttempts(prev => Math.max(0, prev - 1));
      }, 60000); // Reduce attempt count every minute
      return () => clearTimeout(timer);
    }
  }, [recentAttempts]);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    
    // Rate limiting check (5 attempts per 5 minutes)
    if (recentAttempts >= 5) {
      toast({
        title: "Rate limit exceeded",
        description: "Please wait a few minutes before generating more workflows.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setGenerationStatus({
      status: "preparing",
      progress: 10,
      message: "Analyzing your request..."
    });
    setPartialNodes([]);
    setRecentAttempts(prev => prev + 1);

    try {
      // Dynamic import for better performance
      const { generateWorkflow } = await import("@/lib/api/workflow-generation");
      
      // Generate workflow with progress tracking
      const result = await generateWorkflow(
        prompt,
        {
          detailedMode,
          prefillConfig,
          domainHint: detectDomain(prompt),
        },
        existingNodes,
        existingEdges,
        (status, progress, partial) => {
          setGenerationStatus({
            status: status as any,
            progress,
            message: 
              status === "preparing" ? "Analyzing your request..." :
              status === "generating" ? "Designing your workflow..." :
              status === "finalizing" ? "Finalizing components..." :
              status === "complete" ? "Workflow generated successfully!" :
              "Processing..."
          });
          if (partial) setPartialNodes(partial);
        }
      );

      // Update workflow with generated nodes/edges
      if (result && result.nodes && result.edges) {
        onNodesGenerated(result.nodes, result.edges);
        
        // Analytics event - production monitoring
        try {
          if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('workflow_generated', {
              promptLength: prompt.length,
              nodeCount: result.nodes.length,
              edgeCount: result.edges.length,
              hasExisting: existingNodes.length > 0,
            });
          }
        } catch (analyticsError) {
          console.warn('Analytics error:', analyticsError);
        }
        
        toast({
          title: "Workflow generated",
          description: `Created ${result.nodes.length} components based on your description.`,
        });
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error) {
      console.error("Error generating workflow:", error);
      setGenerationStatus({
        status: "error",
        progress: 100, 
        error: error instanceof Error ? error.message : "Failed to generate workflow"
      });
      toast({
        title: "Generation failed",
        description: error instanceof Error 
          ? error.message 
          : "Failed to generate workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Keep generating state true a bit longer to avoid flickering
      setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
    }
  }, [prompt, detailedMode, prefillConfig, isGenerating, existingNodes, existingEdges, onNodesGenerated, setIsGenerating, toast, recentAttempts]);

  // Render generation status
  const renderGenerationStatus = () => (
    <Card className="w-full overflow-hidden shadow-lg">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {generationStatus.status === "error" ? (
              <Badge variant="destructive" className="px-2 py-1">Error</Badge>
            ) : generationStatus.status === "complete" ? (
              <Badge variant="default" className="px-2 py-1 bg-green-600">Complete</Badge>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            <span className="font-medium">
              {generationStatus.message || "Processing..."}
            </span>
          </div>
          
          {generationStatus.status !== "error" && generationStatus.status !== "complete" && (
            <Badge variant="outline" className="text-xs">
              {Math.round(generationStatus.progress)}%
            </Badge>
          )}
        </div>

        {generationStatus.status !== "error" && generationStatus.status !== "complete" && (
          <Progress value={generationStatus.progress} className="h-2" />
        )}

        {partialNodes.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Components being created:</p>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {partialNodes.map((node, index) => (
                <div
                  key={node.id || index}
                  className="text-xs border rounded-md p-2 bg-background flex justify-between items-start"
                >
                  <div>
                    <span className="font-medium block">
                      {node.data?.label || `Component ${index + 1}`}
                    </span>
                    {node.data?.description && (
                      <span className="text-muted-foreground text-[10px] mt-1 block">
                        {node.data.description}
                      </span>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                    {node.data?.blockType || "Processing..."}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {generationStatus.status === "error" && generationStatus.error && (
          <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <p className="font-medium">Error details:</p>
            <p className="mt-1">{generationStatus.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("nl-workflow-generator space-y-3", className)}>
      {isGenerating ? (
        renderGenerationStatus()
      ) : (
        <>
          <div className="prompt-header flex justify-between items-center">
            <h3 className="text-sm font-medium">Describe Your Workflow</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowExamplesPanel(!showExamplesPanel)}>
              {showExamplesPanel ? "Hide Examples" : "See Examples"}
            </Button>
          </div>
          
          <Textarea 
            placeholder="Describe your workflow in detail (e.g., 'Monitor ETH price every hour and send email when it crosses $3000')"
            className="min-h-[80px] resize-y"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          
          {showExamplesPanel && (
            <div className="examples-panel border rounded-md p-3 bg-muted/30">
              <Tabs defaultValue="crypto" onValueChange={setSelectedCategory}>
                <TabsList className="grid grid-cols-3 mb-2">
                  <TabsTrigger value="crypto">Crypto</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="automation">Automation</TabsTrigger>
                </TabsList>
                
                <TabsContent value={selectedCategory} className="mt-0">
                  <div className="suggestion-chips flex flex-wrap gap-2">
                    {promptSuggestions.map(suggestion => (
                      <Chip key={suggestion} onClick={() => setPrompt(suggestion)}>
                        {suggestion}
                      </Chip>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <div className="prompt-actions flex items-center gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim() || recentAttempts >= 5}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Workflow
                </>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Generation Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className="flex items-center justify-between w-full">
                    <Label htmlFor="detailedMode" className="cursor-pointer">Detailed Mode</Label>
                    <Switch 
                      id="detailedMode" 
                      checked={detailedMode} 
                      onCheckedChange={setDetailedMode} 
                    />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex items-center justify-between w-full">
                    <Label htmlFor="prefillConfig" className="cursor-pointer">Pre-fill Configurations</Label>
                    <Switch 
                      id="prefillConfig" 
                      checked={prefillConfig} 
                      onCheckedChange={setPrefillConfig} 
                    />
                  </div>
                </DropdownMenuItem>
                
                {/* Rate limit indicator */}
                {recentAttempts > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Generation attempts: {recentAttempts}/5 in the last 5 minutes
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
};

export default NlWorkflowGenerator;
