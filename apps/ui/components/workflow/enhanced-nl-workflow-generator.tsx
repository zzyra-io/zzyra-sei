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
  Shield,
  AlertTriangle,
  Zap,
  GitBranch,
  Star,
  TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { ValidationFeedback } from "./validation-feedback";
import { FeedbackCollector } from "./feedback-collector";

// Import enhanced API functions
import {
  generateWorkflow,
  type GenerationOptions,
  type GenerationMetadata,
  type ValidationResult,
  type SecurityResult,
  type GenerationMetrics,
  type EnhancedGenerationResult,
} from "@/lib/api/enhanced-workflow-generation";

export interface EnhancedGenerationStatus {
  status: string;
  progress: number;
  message?: string;
  error?: string;
  validationResult?: ValidationResult;
  securityResult?: SecurityResult;
  metrics?: GenerationMetrics;
}

interface EnhancedNlWorkflowGeneratorProps {
  onNodesGenerated: (result: EnhancedGenerationResult) => void;
  existingNodes?: FlowNode[];
  existingEdges?: FlowEdge[];
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  workflowId?: string;
  className?: string;
}

// MCP-powered example suggestions showcasing web2 + web3 integration
// Categories align with available MCP servers: goat (web3), fetch/puppeteer/brave-search/postgres/git/weather/time (web2)
const SUGGESTION_CATEGORIES = {
  web3: [
    "Check my SEI wallet balance and send email alerts when it changes by 10%",
    "Monitor my DeFi positions across chains and rebalance when needed using GOAT SDK",
    "Track gas prices on multiple networks and execute transactions when optimal",
    "Set up automated yield farming with cross-chain bridge operations and notifications",
  ],
  web2: [
    "Scrape competitor product prices using Puppeteer and update our database",
    "Search trending topics with Brave Search and post summaries to our API",
    "Monitor our GitHub repository for new issues and create tickets in PostgreSQL",
    "Get weather data and send daily forecasts to our team via email notifications",
  ],
  hybrid: [
    "Search crypto news, analyze sentiment, and execute trades based on market signals",
    "Monitor web3 protocol updates via GitHub and rebalance portfolio accordingly",
    "Scrape DeFi TVL data from websites and compare with on-chain wallet balances",
    "Track weather patterns and execute climate-based prediction market trades",
  ],
  business: [
    "Automate invoice processing: scrape data, validate in database, send confirmations",
    "Monitor competitor websites and update our pricing in PostgreSQL automatically",
    "Create daily reports by fetching API data and storing insights in database",
    "Set up customer onboarding: web forms, database updates, and email sequences",
  ],
  development: [
    "Auto-deploy when GitHub main branch updates and notify team via webhooks",
    "Monitor API performance, log to database, and alert when thresholds exceeded",
    "Scrape documentation sites for changes and update our knowledge base",
    "Schedule automated database backups and verify integrity via API calls",
  ],
  analytics: [
    "Combine blockchain transaction data with web analytics for user insights",
    "Fetch social media metrics, store in PostgreSQL, and generate trend reports",
    "Monitor DEX prices across chains and create arbitrage opportunity alerts",
    "Track wallet activities and correlate with weather/time patterns for predictions",
  ],
};

// Domain detection with MCP-focused patterns
const detectDomain = (prompt: string): string | undefined => {
  const lowerPrompt = prompt.toLowerCase();
  
  if (/\b(wallet|defi|crypto|bitcoin|eth|btc|blockchain|token|sei|goat|yield|farming|liquidity|swap|bridge|cross.chain)\b/.test(lowerPrompt)) {
    return "web3";
  }
  if (/\b(scrape|puppeteer|api|http|fetch|search|brave|database|postgres|sql|github|git|weather|time)\b/.test(lowerPrompt)) {
    return "web2";
  }
  if (/\b(crypto.news|sentiment|protocol.update|tvl|prediction.market|arbitrage|dex|on.chain)\b/.test(lowerPrompt)) {
    return "hybrid";
  }
  if (/\b(invoice|competitor|pricing|customer|onboard|report|business|automation)\b/.test(lowerPrompt)) {
    return "business";
  }
  if (/\b(deploy|github|api.performance|documentation|backup|monitoring|alert|webhook)\b/.test(lowerPrompt)) {
    return "development";
  }
  if (/\b(analytics|dashboard|report|metric|kpi|data|analysis|tracking|insights|trend)\b/.test(lowerPrompt)) {
    return "analytics";
  }
  
  return undefined;
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
    className="inline-flex items-center rounded-full border border-input bg-background px-2.5 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
  >
    {children}
  </button>
);

// User level detection based on prompt complexity
const detectUserLevel = (prompt: string): "beginner" | "intermediate" | "expert" => {
  const technicalTerms = /\b(api|webhook|lambda|kubernetes|microservice|blockchain|smart contract|ml|ai|algorithm)\b/gi;
  const matches = prompt.match(technicalTerms);
  
  if (matches && matches.length >= 3) return "expert";
  if (matches && matches.length >= 1) return "intermediate";
  return "beginner";
};

export const EnhancedNlWorkflowGenerator: React.FC<EnhancedNlWorkflowGeneratorProps> = ({
  onNodesGenerated,
  existingNodes = [],
  existingEdges = [],
  isGenerating,
  setIsGenerating,
  workflowId,
  className,
}) => {
  // State
  const [prompt, setPrompt] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("web3");
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showExamplesPanel, setShowExamplesPanel] = useState<boolean>(false);
  const [showValidationPanel, setShowValidationPanel] = useState<boolean>(false);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState<boolean>(false);
  
  // Generation Options (Enhanced)
  const [options, setOptions] = useState<GenerationOptions>({
    detailedMode: true,
    prefillConfig: true,
    domainHint: "",
    userLevel: "intermediate",
    enableSecurity: true,
    enableValidation: true,
    autoHeal: true,
  });

  // Generation Metadata
  const [metadata, setMetadata] = useState<GenerationMetadata>({
    workflowId,
    createVersion: true,
    userLevel: options.userLevel,
    tags: [],
  });

  // Status and Results
  const [generationStatus, setGenerationStatus] = useState<EnhancedGenerationStatus>({
    status: "idle",
    progress: 0,
  });
  const [lastGenerationResult, setLastGenerationResult] = useState<EnhancedGenerationResult | null>(null);
  const [partialNodes, setPartialNodes] = useState<FlowNode[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<number>(0);
  const [lastGenerationPrompt, setLastGenerationPrompt] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Auto-detect domain and user level
  useEffect(() => {
    if (prompt.trim()) {
      const detectedDomain = detectDomain(prompt);
      const detectedLevel = detectUserLevel(prompt);
      
      setOptions(prev => ({
        ...prev,
        domainHint: detectedDomain || prev.domainHint,
        userLevel: detectedLevel,
      }));
      
      setMetadata(prev => ({
        ...prev,
        userLevel: detectedLevel,
      }));
    }
  }, [prompt]);

  // Handle enhanced generation
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
      status: "Initializing generation...",
      progress: 5,
    });
    setPartialNodes([]);
    setRecentAttempts((prev) => prev + 1);
    setLastGenerationPrompt(prompt);

    try {
      // Enhanced workflow generation with comprehensive tracking
      const result = await generateWorkflow(
        prompt,
        options,
        existingNodes,
        existingEdges,
        {
          ...metadata,
          workflowId,
        },
        (
          status: string,
          progress?: number,
          partial?: FlowNode[],
          validationResult?: ValidationResult,
          securityResult?: SecurityResult,
          metrics?: GenerationMetrics
        ) => {
          setGenerationStatus({
            status,
            progress: progress ?? 0,
            validationResult,
            securityResult,
            metrics,
          });
          if (partial) setPartialNodes(partial);
        }
      );

      // Store the complete result
      setLastGenerationResult(result);

      // Update workflow with generated nodes/edges
      if (result && result.nodes && result.edges) {
        onNodesGenerated(result);

        // Show validation panel if there are issues
        if (result.validationResult && (!result.validationResult.isValid || result.validationResult.warnings.length > 0)) {
          setShowValidationPanel(true);
        }

        // Show feedback panel after successful generation
        setTimeout(() => {
          setShowFeedbackPanel(true);
        }, 2000);

        const nodeCount = result.nodes.length;
        const hasIssues = result.validationResult && !result.validationResult.isValid;
        const hasWarnings = result.validationResult && result.validationResult.warnings.length > 0;

        toast({
          title: hasIssues ? "Workflow generated with issues" : "Workflow generated successfully",
          description: `Created ${nodeCount} components${hasIssues ? ' (see validation results)' : hasWarnings ? ' (with warnings)' : ''}.`,
          variant: hasIssues ? "destructive" : "default",
        });
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error) {
      console.error("Error generating workflow:", error);
      setGenerationStatus({
        status: "Error",
        progress: 100,
        error: error instanceof Error ? error.message : "Failed to generate workflow",
      });
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate workflow. Please try again.",
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
    options,
    metadata,
    isGenerating,
    existingNodes,
    existingEdges,
    workflowId,
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
      setShowValidationPanel(false);
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

  const updateOptions = (key: keyof GenerationOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const getStatusIcon = () => {
    const status = generationStatus.status.toLowerCase();
    
    if (status.includes("error")) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status.includes("complete")) return <Check className="w-4 h-4 text-green-500" />;
    if (status.includes("security")) return <Shield className="w-4 h-4 text-blue-500 animate-pulse" />;
    if (status.includes("validation")) return <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />;
    if (status.includes("version")) return <GitBranch className="w-4 h-4 text-purple-500 animate-pulse" />;
    if (isGenerating) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    return <Sparkles className="w-4 h-4 text-purple-500" />;
  };

  const getStatusMessage = () => {
    if (generationStatus.error) return generationStatus.error;
    if (generationStatus.status === "idle") {
      return isExpanded && prompt.trim() ? "Ready to generate" : "Generate Workflow";
    }
    return generationStatus.status;
  };

  const getStatusColor = () => {
    const status = generationStatus.status.toLowerCase();
    if (status.includes("error")) return "text-red-600";
    if (status.includes("complete")) return "text-green-600";
    if (status.includes("security") || status.includes("validation")) return "text-blue-600";
    if (isGenerating) return "text-blue-600";
    return "text-gray-700";
  };

  const isReady = prompt.trim() && !isGenerating && recentAttempts < 5;

  // Get active features indicators
  const getActiveFeatures = () => {
    const features = [];
    if (options.enableSecurity) features.push({ icon: Shield, label: "Security", color: "text-blue-500" });
    if (options.enableValidation) features.push({ icon: AlertTriangle, label: "Validation", color: "text-yellow-500" });
    if (options.autoHeal) features.push({ icon: Zap, label: "Auto-heal", color: "text-purple-500" });
    if (metadata.createVersion) features.push({ icon: GitBranch, label: "Versioning", color: "text-green-500" });
    return features;
  };

  // Render generation status for expanded view
  const renderGenerationStatus = () => (
    <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-200/50">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="font-medium text-blue-900 text-sm">
            {generationStatus.status}
          </div>
          {generationStatus.metrics && (
            <div className="text-xs text-blue-700 mt-1">
              Processing time: {generationStatus.metrics.processingTime}ms
              {generationStatus.metrics.autoCorrections > 0 && (
                <span className="ml-2">• {generationStatus.metrics.autoCorrections} auto-corrections</span>
              )}
            </div>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {Math.round(generationStatus.progress)}%
        </Badge>
      </div>
      <Progress value={generationStatus.progress} className="h-1.5" />

      {partialNodes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-blue-800">
            Creating components:
          </p>
          <div className="space-y-1 max-h-[80px] overflow-y-auto">
            {partialNodes.slice(0, 3).map((node, index) => (
              <div
                key={node.id || index}
                className="text-xs border rounded p-2 bg-white/50 flex justify-between items-center"
              >
                <span className="font-medium truncate flex-1">
                  {(node.data as any)?.label || `Component ${index + 1}`}
                </span>
                <Badge variant="secondary" className="text-[10px] shrink-0 ml-1">
                  {(node.data as any)?.blockType || "Processing..."}
                </Badge>
              </div>
            ))}
            {partialNodes.length > 3 && (
              <div className="text-xs text-blue-600 text-center">
                +{partialNodes.length - 3} more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time validation and security feedback */}
      {generationStatus.validationResult && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 text-xs">
            {generationStatus.validationResult.isValid 
              ? "Validation passed" 
              : `${generationStatus.validationResult.errors.length} validation issues detected`}
          </AlertDescription>
        </Alert>
      )}

      {generationStatus.securityResult && !generationStatus.securityResult.isSecure && (
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-xs">
            {generationStatus.securityResult.issues.length} security issues detected
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Floating Panels */}
      {isExpanded && (
        <div className="space-y-3 mb-4">
          {/* Examples Panel */}
          {showExamplesPanel && (
            <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg p-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">Example Workflows</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExamplesPanel(false)}
                  className="h-6 w-6 p-0 rounded-full"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Tabs
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 h-8 mb-3">
                  <TabsTrigger value="web3" className="text-xs">Web3</TabsTrigger>
                  <TabsTrigger value="web2" className="text-xs">Web2</TabsTrigger>
                  <TabsTrigger value="hybrid" className="text-xs">Hybrid</TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-3 h-8 mb-3 mt-2">
                  <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
                  <TabsTrigger value="development" className="text-xs">DevOps</TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value={selectedCategory} className="mt-0">
                  <div className="space-y-2">
                    {promptSuggestions.map((suggestion) => (
                      <Chip
                        key={suggestion}
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        {suggestion}
                      </Chip>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Validation Results Panel */}
          {showValidationPanel && lastGenerationResult?.validationResult && (
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-sm">Validation Results</span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <ValidationFeedback
                  validationResult={lastGenerationResult.validationResult}
                  securityResult={lastGenerationResult.securityResult}
                  metrics={lastGenerationResult.metrics}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Main Floating Bar */}
      <div
        className={cn(
          "bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl transition-all duration-300 ease-out",
          isExpanded ? "min-h-[140px]" : "h-14",
          generationStatus.status.includes("complete") && "ring-2 ring-green-200",
          generationStatus.status.includes("error") && "ring-2 ring-red-200"
        )}
      >
        {/* Compact State */}
        {!isExpanded && (
          <button
            onClick={handleExpand}
            disabled={isGenerating}
            className="w-full h-14 px-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-2xl disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <span className={cn("font-medium", getStatusColor())}>
                {getStatusMessage()}
              </span>
              {recentAttempts > 0 && (
                <Badge variant="outline" className="text-xs">
                  {recentAttempts}/5
                </Badge>
              )}
              {/* Show active features in compact mode */}
              {getActiveFeatures().slice(0, 2).map((feature, index) => (
                <feature.icon key={index} className={cn("w-3 h-3", feature.color)} />
              ))}
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Expanded State */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <span className={cn("font-medium", getStatusColor())}>
                  {getStatusMessage()}
                </span>
                {recentAttempts > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {recentAttempts}/5
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-xs">
                      Generation Options
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <div className="p-2 space-y-3">
                      <div>
                        <Label className="text-xs">User Level</Label>
                        <Select
                          value={options.userLevel}
                          onValueChange={(value) => updateOptions('userLevel', value)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Detailed Mode</Label>
                          <Switch
                            checked={options.detailedMode}
                            onCheckedChange={(checked) => updateOptions('detailedMode', checked)}
                            className="scale-75"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Pre-fill Config</Label>
                          <Switch
                            checked={options.prefillConfig}
                            onCheckedChange={(checked) => updateOptions('prefillConfig', checked)}
                            className="scale-75"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Security Validation</Label>
                          <Switch
                            checked={options.enableSecurity}
                            onCheckedChange={(checked) => updateOptions('enableSecurity', checked)}
                            className="scale-75"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Auto-heal Issues</Label>
                          <Switch
                            checked={options.autoHeal}
                            onCheckedChange={(checked) => updateOptions('autoHeal', checked)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCollapse}
                  disabled={isGenerating}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Active Features Indicators */}
            <div className="flex flex-wrap gap-1">
              {getActiveFeatures().map((feature, index) => (
                <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                  <feature.icon className={cn("w-3 h-3", feature.color)} />
                  {feature.label}
                </Badge>
              ))}
            </div>

            {/* Generation Status */}
            {isGenerating && renderGenerationStatus()}

            {/* Input Area */}
            {!isGenerating && (
              <div className="space-y-3">
                <Textarea
                  ref={textareaRef}
                  placeholder="Describe your workflow (e.g., 'Check my SEI wallet balance and send email alerts when it changes by 10%')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] max-h-[120px] resize-none border-0 bg-gray-50/50 focus-visible:ring-1 focus-visible:ring-blue-200 text-sm"
                />

                {/* Quick Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowExamplesPanel(!showExamplesPanel)}
                      className="h-8 px-3 text-xs"
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Examples
                    </Button>
                    {lastGenerationResult && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowValidationPanel(!showValidationPanel)}
                        className="h-8 px-3 text-xs"
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Results
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!isReady}
                    className={cn(
                      "h-8 px-4 text-xs transition-all rounded-full",
                      isReady
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                </div>

                {/* Character Count and Domain Detection */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    {options.domainHint && (
                      <Badge variant="secondary" className="text-xs">
                        {options.domainHint}
                      </Badge>
                    )}
                    <span>Level: {options.userLevel}</span>
                  </div>
                  <span>{prompt.length} characters</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Collection */}
      {showFeedbackPanel && lastGenerationResult && (
        <div className="mt-4">
          <FeedbackCollector
            feedbackType="workflow_generation"
            generationPrompt={lastGenerationPrompt}
            generatedOutput={lastGenerationResult}
            executionResult={lastGenerationResult.validationResult?.isValid ? 'success' : 'partial'}
            onFeedbackSubmitted={() => setShowFeedbackPanel(false)}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedNlWorkflowGenerator;