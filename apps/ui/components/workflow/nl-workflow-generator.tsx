"use client";

import type React from "react";

import { useState, useCallback, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Lightbulb,
  X,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";

// Type definitions
export interface GenerationOptions {
  detailedMode: boolean;
  prefillConfig: boolean;
  domainHint?: string;
}

export interface GenerationStatus {
  status:
    | "idle"
    | "preparing"
    | "generating"
    | "finalizing"
    | "complete"
    | "error";
  progress: number;
  message?: string;
  error?: string;
}

interface NlWorkflowGeneratorProps {
  onNodesGenerated: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  existingNodes?: FlowNode[];
  existingEdges?: FlowEdge[];
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
    className='inline-flex items-center rounded-full border border-input bg-background px-2.5 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors'>
    {children}
  </button>
);

// Simple domain detection
const detectDomain = (prompt: string): string | undefined => {
  const lowerPrompt = prompt.toLowerCase();
  if (
    /\b(crypto|bitcoin|eth|btc|blockchain|token|uniswap|defi)\b/.test(
      lowerPrompt
    )
  ) {
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showExamplesPanel, setShowExamplesPanel] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    status: "idle",
    progress: 0,
  });
  const [partialNodes, setPartialNodes] = useState<Partial<FlowNode>[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Update suggestions when category changes
  useEffect(() => {
    setPromptSuggestions(
      SUGGESTION_CATEGORIES[
        selectedCategory as keyof typeof SUGGESTION_CATEGORIES
      ] || []
    );
  }, [selectedCategory]);

  // Rate limit protection
  useEffect(() => {
    if (recentAttempts > 0) {
      const timer = setTimeout(() => {
        setRecentAttempts((prev) => Math.max(0, prev - 1));
      }, 60000); // Reduce attempt count every minute
      return () => clearTimeout(timer);
    }
  }, [recentAttempts]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt, isExpanded]);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    // Rate limiting check (5 attempts per 5 minutes)
    if (recentAttempts >= 5) {
      toast({
        title: "Rate limit exceeded",
        description:
          "Please wait a few minutes before generating more workflows.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationStatus({
      status: "preparing",
      progress: 10,
      message: "Analyzing your request...",
    });
    setPartialNodes([]);
    setRecentAttempts((prev) => prev + 1);

    try {
      // Dynamic import for better performance
      const { generateWorkflow } = await import(
        "@/lib/api/workflow-generation"
      );

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
        (
          status: GenerationStatus["status"],
          progress: number,
          partial: Partial<FlowNode>[] | undefined
        ) => {
          setGenerationStatus({
            status,
            progress: progress ?? 0,
            message:
              status === "preparing"
                ? "Analyzing your request..."
                : status === "generating"
                  ? "Designing your workflow..."
                  : status === "finalizing"
                    ? "Finalizing components..."
                    : status === "complete"
                      ? "Workflow generated successfully!"
                      : "Processing...",
          });
          if (partial) setPartialNodes(partial);
        }
      );

      // Update workflow with generated nodes/edges
      if (result && result.nodes && result.edges) {
        // Ensure all node types are strings (fallback to empty string if undefined)
        const safeNodes = (result.nodes as FlowNode[]).map((n) => ({
          ...n,
          type: typeof n.type === "string" ? n.type : "",
        }));

        onNodesGenerated(safeNodes, result.edges as FlowEdge[]);

        // Analytics event - production monitoring
        try {
          if (
            typeof window !== "undefined" &&
            typeof (window as { posthog?: any }).posthog !== "undefined"
          ) {
            (window as { posthog: { capture: Function } }).posthog.capture(
              "workflow_generated",
              {
                promptLength: prompt.length,
                nodeCount: result.nodes.length,
                edgeCount: result.edges.length,
                hasExisting: existingNodes.length > 0,
              }
            );
          }
        } catch (analyticsError: unknown) {
          console.warn("Analytics error:", analyticsError);
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
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate workflow",
      });
      toast({
        title: "Generation failed",
        description:
          error instanceof Error
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
  }, [
    prompt,
    detailedMode,
    prefillConfig,
    isGenerating,
    existingNodes,
    existingEdges,
    onNodesGenerated,
    setIsGenerating,
    toast,
    recentAttempts,
  ]);

  const handleExpand = () => {
    if (!isGenerating) {
      setIsExpanded(true);
    }
  };

  const handleCollapse = () => {
    if (!isGenerating) {
      setIsExpanded(false);
      setShowExamplesPanel(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
    if (e.key === "Escape") {
      handleCollapse();
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setPrompt(suggestion);
    setShowExamplesPanel(false);
  };

  const getStatusIcon = () => {
    switch (generationStatus.status) {
      case "preparing":
      case "generating":
      case "finalizing":
        return <Loader2 className='w-4 h-4 animate-spin text-blue-500' />;
      case "complete":
        return <Check className='w-4 h-4 text-green-500' />;
      case "error":
        return <AlertCircle className='w-4 h-4 text-red-500' />;
      default:
        return <Sparkles className='w-4 h-4 text-purple-500' />;
    }
  };

  const getStatusMessage = () => {
    switch (generationStatus.status) {
      case "preparing":
      case "generating":
      case "finalizing":
        return generationStatus.message || "Processing...";
      case "complete":
        return "Workflow generated successfully!";
      case "error":
        return "Failed to generate workflow";
      default:
        return isExpanded && prompt.trim()
          ? "Ready to generate"
          : "Generate Workflow";
    }
  };

  const getStatusColor = () => {
    switch (generationStatus.status) {
      case "preparing":
      case "generating":
      case "finalizing":
        return "text-blue-600";
      case "complete":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-700";
    }
  };

  const isReady = prompt.trim() && !isGenerating && recentAttempts < 5;

  // Render generation status for expanded view
  const renderGenerationStatus = () => (
    <div className='space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-200/50'>
      <div className='flex items-center gap-3'>
        <Loader2 className='w-5 h-5 animate-spin text-blue-600' />
        <div className='flex-1'>
          <div className='font-medium text-blue-900 text-sm'>
            Generating workflow...
          </div>
          <div className='text-xs text-blue-700'>
            {generationStatus.message}
          </div>
        </div>
        <Badge variant='outline' className='text-xs'>
          {Math.round(generationStatus.progress)}%
        </Badge>
      </div>
      <Progress value={generationStatus.progress} className='h-1.5' />

      {partialNodes.length > 0 && (
        <div className='space-y-2'>
          <p className='text-xs font-medium text-blue-800'>
            Creating components:
          </p>
          <div className='space-y-1 max-h-[80px] overflow-y-auto'>
            {partialNodes.slice(0, 3).map((node, index) => (
              <div
                key={node.id || index}
                className='text-xs border rounded p-2 bg-white/50 flex justify-between items-center'>
                <span className='font-medium truncate flex-1'>
                  {node.data?.label || `Component ${index + 1}`}
                </span>
                <Badge
                  variant='secondary'
                  className='text-[10px] shrink-0 ml-1'>
                  {node.data?.blockType || "Processing..."}
                </Badge>
              </div>
            ))}
            {partialNodes.length > 3 && (
              <div className='text-xs text-blue-600 text-center'>
                +{partialNodes.length - 3} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Floating Panels */}
      {isExpanded && (
        <div className='space-y-3 mb-4'>
          {/* Examples Panel */}
          {showExamplesPanel && (
            <div className='bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg p-4 animate-in slide-in-from-top-2 duration-200'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <Lightbulb className='w-4 h-4 text-amber-500' />
                  <span className='font-medium text-sm'>Examples</span>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowExamplesPanel(false)}
                  className='h-6 w-6 p-0 rounded-full'>
                  <X className='w-3 h-3' />
                </Button>
              </div>
              <Tabs
                defaultValue='crypto'
                onValueChange={setSelectedCategory}
                className='w-full'>
                <TabsList className='grid grid-cols-3 h-8 mb-3'>
                  <TabsTrigger value='crypto' className='text-xs'>
                    Crypto
                  </TabsTrigger>
                  <TabsTrigger value='email' className='text-xs'>
                    Email
                  </TabsTrigger>
                  <TabsTrigger value='automation' className='text-xs'>
                    Auto
                  </TabsTrigger>
                </TabsList>
                <TabsContent value={selectedCategory} className='mt-0'>
                  <div className='flex flex-wrap gap-2'>
                    {promptSuggestions.map((suggestion) => (
                      <Chip
                        key={suggestion}
                        onClick={() => handleSuggestionSelect(suggestion)}>
                        {suggestion}
                      </Chip>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}

      {/* Main Floating Bar */}
      <div
        className={cn(
          "bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl transition-all duration-300 ease-out",
          isExpanded ? "min-h-[140px]" : "h-14",
          generationStatus.status === "complete" && "ring-2 ring-green-200",
          generationStatus.status === "error" && "ring-2 ring-red-200"
        )}>
        {/* Compact State */}
        {!isExpanded && (
          <button
            onClick={handleExpand}
            disabled={isGenerating}
            className='w-full h-14 px-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-2xl disabled:cursor-not-allowed'>
            <div className='flex items-center gap-3'>
              {getStatusIcon()}
              <span className={cn("font-medium", getStatusColor())}>
                {getStatusMessage()}
              </span>
              {recentAttempts > 0 && (
                <Badge variant='outline' className='text-xs'>
                  {recentAttempts}/5
                </Badge>
              )}
            </div>
            <ChevronUp className='w-4 h-4 text-gray-400' />
          </button>
        )}

        {/* Expanded State */}
        {isExpanded && (
          <div className='p-4 space-y-4'>
            {/* Header */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                {getStatusIcon()}
                <span className={cn("font-medium", getStatusColor())}>
                  {getStatusMessage()}
                </span>
                {recentAttempts > 0 && (
                  <Badge variant='outline' className='text-xs'>
                    {recentAttempts}/5
                  </Badge>
                )}
              </div>
              <div className='flex items-center gap-2'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0 rounded-full'>
                      <Settings className='w-4 h-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuLabel className='text-xs'>
                      Generation Options
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <div className='flex items-center justify-between w-full'>
                        <Label
                          htmlFor='detailedMode'
                          className='cursor-pointer text-xs'>
                          Detailed Mode
                        </Label>
                        <Switch
                          id='detailedMode'
                          checked={detailedMode}
                          onCheckedChange={setDetailedMode}
                          className='scale-75'
                        />
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className='flex items-center justify-between w-full'>
                        <Label
                          htmlFor='prefillConfig'
                          className='cursor-pointer text-xs'>
                          Pre-fill Config
                        </Label>
                        <Switch
                          id='prefillConfig'
                          checked={prefillConfig}
                          onCheckedChange={setPrefillConfig}
                          className='scale-75'
                        />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleCollapse}
                  disabled={isGenerating}
                  className='h-8 w-8 p-0 rounded-full'>
                  <ChevronDown className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* Generation Status */}
            {isGenerating && renderGenerationStatus()}

            {/* Input Area */}
            {!isGenerating && (
              <div className='space-y-3'>
                <Textarea
                  ref={textareaRef}
                  placeholder="Describe your workflow (e.g., 'Monitor ETH price and send email when it crosses $3000')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className='min-h-[60px] max-h-[120px] resize-none border-0 bg-gray-50/50 focus-visible:ring-1 focus-visible:ring-blue-200 text-sm'
                />

                {/* Quick Actions */}
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setShowExamplesPanel(!showExamplesPanel)}
                      className='h-8 px-3 text-xs'>
                      <Lightbulb className='w-3 h-3 mr-1' />
                      Examples
                    </Button>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!isReady}
                    className={cn(
                      "h-8 px-4 text-xs transition-all rounded-full",
                      isReady
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}>
                    <Sparkles className='w-3 h-3 mr-1' />
                    Generate
                  </Button>
                </div>

                {/* Character Count */}
                {prompt.length > 0 && (
                  <div className='text-xs text-gray-500 text-right'>
                    {prompt.length} characters
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NlWorkflowGenerator;
