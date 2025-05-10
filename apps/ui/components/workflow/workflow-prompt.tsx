"use client";

import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Wand2,
  Sparkles,
  Info,
  Settings,
  ServerCrash,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface GenerationOptions {
  detailedMode: boolean;
  prefillConfig: boolean;
  domainHint: string | null;
}

export interface WorkflowGenerationStatus {
  status: "idle" | "preparing" | "generating" | "finalizing" | "complete" | "error";
  progress: number;
  error?: string;
}

interface WorkflowPromptProps {
  onGenerate: (prompt: string, options: GenerationOptions) => Promise<void>;
  isGenerating: boolean;
  generationStatus: WorkflowGenerationStatus;
}

const EXAMPLE_PROMPTS = [
  "Create a workflow that fetches ETH price from CoinGecko and sends alerts when it drops by 5% in 24 hours",
  "Build a DeFi portfolio rebalancer that swaps assets to maintain a 60-40 ratio between ETH and USDC",
  "Create a data pipeline that collects DEX trading volumes and saves them to a database every hour",
  "Generate a workflow that monitors Twitter for new tweets from Vitalik and creates a summary using AI"
];

const DOMAIN_OPTIONS = [
  { label: "DeFi / Trading", value: "DeFi trading" },
  { label: "NFT / Digital Assets", value: "NFT and digital assets" },
  { label: "Data Analytics", value: "blockchain data analytics" },
  { label: "Social / Community", value: "social and community" },
];

export const WorkflowPrompt: React.FC<WorkflowPromptProps> = ({
  onGenerate,
  isGenerating,
  generationStatus,
}) => {
  const [prompt, setPrompt] = useState("");
  const [recentAttempts, setRecentAttempts] = useState<number>(0);
  const [options, setOptions] = useState<GenerationOptions>({
    detailedMode: false,
    prefillConfig: true,
    domainHint: null,
  });
  const { toast } = useToast();
  
  // Reset recent attempts counter after 5 minutes
  useEffect(() => {
    if (recentAttempts > 0) {
      const timer = setTimeout(() => {
        setRecentAttempts(0);
      }, 5 * 60 * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [recentAttempts]);
  
  const setExamplePrompt = (example: string) => {
    setPrompt(example);
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    // Rate limiting check
    if (recentAttempts >= 5) {
      toast({
        title: "Rate limit exceeded",
        description: "You've made too many generation attempts recently. Please wait a few minutes.",
        variant: "destructive",
      });
      return;
    }
    
    setRecentAttempts(prev => prev + 1);
    
    try {
      // Track generation attempt for analytics
      try {
        if (typeof window !== 'undefined' && window.posthog) {
          window.posthog.capture('workflow_generated', {
            promptLength: prompt.length,
            options,
          });
        }
      } catch (analyticsError) {
        console.warn('Analytics error:', analyticsError);
      }
      
      await onGenerate(prompt, options);
    } catch (error) {
      console.error("Error generating workflow:", error);
      
      toast({
        title: "Generation failed",
        description: error instanceof Error
          ? error.message
          : "Failed to generate workflow. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const statusMessages = {
    preparing: "Preparing your workflow...",
    generating: "Generating node structure...",
    finalizing: "Finalizing connections...",
    complete: "Workflow generated successfully!",
    error: "Error generating workflow",
    idle: "",
  };
  
  return (
    <div className="space-y-2 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Generate with AI</h3>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">AI Workflow Generation</h4>
                <p className="text-sm text-muted-foreground">
                  Describe the workflow you want to create in natural language.
                  Be specific about what data sources, operations, and outputs you need.
                </p>
                <p className="text-sm text-muted-foreground">
                  Examples: "Monitor ETH price and send alerts", "Schedule weekly reports on portfolio performance"
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <div className="flex items-center justify-between my-2">
                <Label htmlFor="detail-mode" className="text-sm cursor-pointer">
                  Detailed Mode
                </Label>
                <Switch
                  id="detail-mode"
                  checked={options.detailedMode}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, detailedMode: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between my-2">
                <Label htmlFor="prefill-config" className="text-sm cursor-pointer">
                  Pre-fill Config
                </Label>
                <Switch
                  id="prefill-config"
                  checked={options.prefillConfig}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, prefillConfig: checked }))
                  }
                />
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            <div className="px-2 py-1.5">
              <Label className="text-sm">Domain Hint</Label>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {DOMAIN_OPTIONS.map((domain) => (
                  <Badge
                    key={domain.value}
                    variant={
                      options.domainHint === domain.value
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer text-xs justify-center"
                    onClick={() =>
                      setOptions((prev) => ({
                        ...prev,
                        domainHint:
                          prev.domainHint === domain.value
                            ? null
                            : domain.value,
                      }))
                    }
                  >
                    {domain.label}
                  </Badge>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="relative">
        <Textarea
          placeholder="Describe the workflow you want to create... (e.g., 'Create a workflow that monitors ETH price and sends alerts')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className={cn(
            "min-h-[100px] pr-20",
            generationStatus.status === "error" && "border-red-500"
          )}
          disabled={isGenerating}
        />
        
        <Button
          size="sm"
          className="absolute bottom-3 right-3"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating || recentAttempts >= 5}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>
      
      {/* Examples */}
      {!prompt && !isGenerating && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-2">
            Try an example:
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={index}
                className="text-xs px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-full text-secondary-foreground transition-colors"
                onClick={() => setExamplePrompt(example)}
              >
                {example.length > 50
                  ? example.substring(0, 50) + "..."
                  : example}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Generation Status */}
      {generationStatus.status !== "idle" && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {generationStatus.status === "error" ? (
                <ServerCrash className="h-4 w-4 text-destructive" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <span
                className={cn(
                  "text-sm",
                  generationStatus.status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {statusMessages[generationStatus.status]}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(generationStatus.progress)}%
            </span>
          </div>
          <Progress value={generationStatus.progress} className="h-1" />
          
          {generationStatus.status === "error" && generationStatus.error && (
            <p className="text-xs text-destructive mt-1">{generationStatus.error}</p>
          )}
        </div>
      )}
      
      {/* Rate limit indicator */}
      {recentAttempts > 0 && (
        <div className="px-2 py-1 text-xs text-muted-foreground border-l-2 border-primary/20 pl-3">
          <p>Generation attempts: {recentAttempts}/5</p>
          <p>Rate limiting may apply if you make too many requests.</p>
        </div>
      )}
    </div>
  );
};

export default WorkflowPrompt;
