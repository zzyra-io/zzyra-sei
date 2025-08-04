"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Settings,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Lightbulb,
  X,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Example suggestions by category
const SUGGESTION_CATEGORIES = {
  crypto: [
    "Monitor ETH price every hour and send email when it crosses $3000",
    "Buy 0.1 ETH on Uniswap when gas prices are below 30 gwei",
    "Track my wallet balance and notify me when it drops below $5000",
  ],
  defi: [
    "Monitor my ETH and USDC balances on Base Sepolia and alert me when ETH drops below $2000",
    "Rebalance my portfolio to maintain 60% ETH and 40% USDC when prices change by more than 5%",
    "Optimize gas usage for my swaps on Base Sepolia and execute only during low gas periods",
  ],
  email: [
    "Send a weekly summary of my portfolio performance every Monday at 9 AM",
    "Email my team when a new transaction over $10,000 is detected",
    "Send a congratulatory message when my balance reaches a new all-time high",
  ],
  automation: [
    "Run a sentiment analysis on crypto news articles daily and summarize the results",
    "Create a backup of my transaction history every week",
    "Connect to Discord and post alerts when major price movements occur",
  ],
};

// Available templates
const TEMPLATES = [
  {
    id: "price-monitor",
    name: "Price Monitor",
    description: "Track crypto prices with smart alerts",
    category: "crypto",
  },
  {
    id: "gas-optimizer",
    name: "Gas Optimizer",
    description: "Execute transactions during low gas periods",
    category: "defi",
  },
];

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

interface WorkflowPromptProps {
  onGenerate: (prompt: string, options: GenerationOptions) => void;
  isGenerating: boolean;
  generationProgress?: number;
  generationStatus?: string;
  generationState?: "idle" | "generating" | "success" | "error";
  className?: string;
}

export interface GenerationOptions {
  detailedMode: boolean;
  prefillConfig: boolean;
  domainHint?: string;
  templateId?: string;
  userId?: string;
}

export const WorkflowPrompt = ({
  onGenerate,
  isGenerating,
  generationProgress = 0,
  generationStatus = "Analyzing prompt...",
  generationState = "idle",
  className,
}: WorkflowPromptProps) => {
  const [nlPrompt, setNlPrompt] = useState<string>("");
  const [detailedMode, setDetailedMode] = useState<boolean>(true);
  const [prefillConfig, setPrefillConfig] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("crypto");
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showExamplesPanel, setShowExamplesPanel] = useState<boolean>(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update suggestions when category changes
  useEffect(() => {
    setPromptSuggestions(
      SUGGESTION_CATEGORIES[
        selectedCategory as keyof typeof SUGGESTION_CATEGORIES
      ] || []
    );
  }, [selectedCategory]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [nlPrompt, isExpanded]);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleGenerate = () => {
    if ((!nlPrompt.trim() && !selectedTemplateId) || isGenerating) return;

    onGenerate(nlPrompt, {
      detailedMode,
      prefillConfig,
      domainHint: detectDomain(nlPrompt),
      templateId: selectedTemplateId,
      userId: "",
    });
  };

  // Simple domain detection based on keywords
  const detectDomain = (prompt: string): string | undefined => {
    const lowerPrompt = prompt.toLowerCase();
    if (
      /\b(crypto|bitcoin|eth|btc|blockchain|token|uniswap)\b/.test(lowerPrompt)
    ) {
      return "crypto";
    }
    if (/\b(defi|portfolio|rebalance|base sepolia|yield)\b/.test(lowerPrompt)) {
      return "defi";
    }
    if (/\b(email|send|message|notify|alert)\b/.test(lowerPrompt)) {
      return "communication";
    }
    return undefined;
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setNlPrompt(template.description);
      setSelectedTemplateId(templateId);
      setShowTemplatesPanel(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setNlPrompt(suggestion);
    setShowExamplesPanel(false);
    if (selectedTemplateId) setSelectedTemplateId("");
  };

  const handleExpand = () => {
    if (!isGenerating) {
      setIsExpanded(true);
    }
  };

  const handleCollapse = () => {
    if (!isGenerating) {
      setIsExpanded(false);
      setShowExamplesPanel(false);
      setShowTemplatesPanel(false);
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

  const getStatusIcon = () => {
    switch (generationState) {
      case "generating":
        return <Loader2 className='w-4 h-4 animate-spin text-blue-500' />;
      case "success":
        return <Check className='w-4 h-4 text-green-500' />;
      case "error":
        return <AlertCircle className='w-4 h-4 text-red-500' />;
      default:
        return <Sparkles className='w-4 h-4 text-purple-500' />;
    }
  };

  const getStatusMessage = () => {
    switch (generationState) {
      case "generating":
        return generationStatus;
      case "success":
        return "Workflow generated successfully!";
      case "error":
        return "Failed to generate workflow";
      default:
        return isExpanded && nlPrompt.trim()
          ? "Ready to generate"
          : "Generate Workflow";
    }
  };

  const getStatusColor = () => {
    switch (generationState) {
      case "generating":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-700";
    }
  };

  const isReady = (nlPrompt.trim() || selectedTemplateId) && !isGenerating;

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Floating Panels */}
      {isExpanded && (
        <div className='space-y-3 mb-4'>
          {/* Templates Panel */}
          {showTemplatesPanel && (
            <div className='bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg p-4 animate-in slide-in-from-top-2 duration-200'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <Zap className='w-4 h-4 text-blue-500' />
                  <span className='font-medium text-sm'>Templates</span>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowTemplatesPanel(false)}
                  className='h-6 w-6 p-0 rounded-full'>
                  <X className='w-3 h-3' />
                </Button>
              </div>
              <div className='space-y-2'>
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors border",
                      selectedTemplateId === template.id
                        ? "bg-blue-50 border-blue-200"
                        : "border-gray-200"
                    )}>
                    <div className='flex items-center justify-between'>
                      <div className='font-medium text-sm'>{template.name}</div>
                      {selectedTemplateId === template.id && (
                        <Check className='w-4 h-4 text-blue-500' />
                      )}
                    </div>
                    <div className='text-xs text-gray-600 mt-1'>
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <TabsList className='grid grid-cols-4 h-8 mb-3'>
                  <TabsTrigger value='crypto' className='text-xs'>
                    Crypto
                  </TabsTrigger>
                  <TabsTrigger value='defi' className='text-xs'>
                    DeFi
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
          generationState === "success" && "ring-2 ring-green-200",
          generationState === "error" && "ring-2 ring-red-200"
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

            {/* Progress Bar */}
            {isGenerating && generationProgress > 0 && (
              <div className='space-y-2'>
                <Progress value={generationProgress} className='h-1.5' />
              </div>
            )}

            {/* Input Area */}
            <div className='space-y-3'>
              <Textarea
                ref={textareaRef}
                placeholder="Describe your workflow (e.g., 'Monitor ETH price and send email when it crosses $3000')"
                value={nlPrompt}
                onChange={(e) => {
                  setNlPrompt(e.target.value);
                  if (selectedTemplateId) setSelectedTemplateId("");
                }}
                onKeyDown={handleKeyDown}
                className='min-h-[60px] max-h-[120px] resize-none border-0 bg-gray-50/50 focus-visible:ring-1 focus-visible:ring-blue-200 text-sm'
                disabled={isGenerating}
              />

              {/* Selected Template Indicator */}
              {selectedTemplateId && (
                <div className='flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg'>
                  <Zap className='w-3 h-3 text-blue-600' />
                  <span className='text-xs font-medium text-blue-800'>
                    Template:{" "}
                    {TEMPLATES.find((t) => t.id === selectedTemplateId)?.name}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedTemplateId("")}
                    className='h-5 w-5 p-0 ml-auto text-blue-600'>
                    <X className='w-3 h-3' />
                  </Button>
                </div>
              )}

              {/* Quick Actions */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setShowTemplatesPanel(!showTemplatesPanel);
                      setShowExamplesPanel(false);
                    }}
                    disabled={isGenerating}
                    className='h-8 px-3 text-xs'>
                    <Zap className='w-3 h-3 mr-1' />
                    Templates
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setShowExamplesPanel(!showExamplesPanel);
                      setShowTemplatesPanel(false);
                    }}
                    disabled={isGenerating}
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
                  {isGenerating ? (
                    <>
                      <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className='w-3 h-3 mr-1' />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              {/* Character Count */}
              {nlPrompt.length > 0 && (
                <div className='text-xs text-gray-500 text-right'>
                  {nlPrompt.length} characters
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
