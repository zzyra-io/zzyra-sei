"use client";

import React, { useState, useRef } from "react";
import { 
  Loader2, 
  SendHorizontal, 
  Settings, 
  Shield, 
  AlertTriangle, 
  Zap,
  GitBranch,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { 
  GenerationOptions,
  GenerationMetadata,
  ValidationResult,
  SecurityResult,
  GenerationMetrics 
} from "@/lib/api/enhanced-workflow-generation";
import { EnhancedGenerationStatus } from "@/components/workflow/enhanced-generation-status";

interface EnhancedCommandInputProps {
  onGenerate: (
    prompt: string,
    options: GenerationOptions,
    metadata?: GenerationMetadata
  ) => Promise<void>;
  isGenerating: boolean;
  workflowId?: string;
  generationStatus?: string;
  generationProgress?: number;
  validationResult?: ValidationResult;
  securityResult?: SecurityResult;
  metrics?: GenerationMetrics;
  error?: string;
  partialNodes?: any[];
}

const DOMAIN_HINTS = [
  { value: "", label: "Auto-detect" },
  { value: "defi", label: "DeFi & Blockchain" },
  { value: "healthcare", label: "Healthcare" },
  { value: "enterprise", label: "Enterprise" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "social", label: "Social Media" },
  { value: "analytics", label: "Data Analytics" },
  { value: "iot", label: "IoT & Devices" },
];

const USER_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
];

export function EnhancedCommandInput({
  onGenerate,
  isGenerating,
  workflowId,
  generationStatus,
  generationProgress = 0,
  validationResult,
  securityResult,
  metrics,
  error,
  partialNodes
}: EnhancedCommandInputProps) {
  const [prompt, setPrompt] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Generation Options
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

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setLocalError(null);
    try {
      await onGenerate(prompt, options, metadata);
      setPrompt("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate workflow";
      setLocalError(errorMessage);
    }
  };

  const updateOptions = (key: keyof GenerationOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const updateMetadata = (key: keyof GenerationMetadata, value: any) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const getStatusIndicators = () => {
    const indicators = [];
    
    if (options.enableSecurity) {
      indicators.push(
        <Badge key="security" variant="outline" className="flex items-center space-x-1">
          <Shield className="h-3 w-3 text-blue-500" />
          <span>Security</span>
        </Badge>
      );
    }
    
    if (options.enableValidation) {
      indicators.push(
        <Badge key="validation" variant="outline" className="flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
          <span>Validation</span>
        </Badge>
      );
    }
    
    if (options.autoHeal) {
      indicators.push(
        <Badge key="autoheal" variant="outline" className="flex items-center space-x-1">
          <Zap className="h-3 w-3 text-purple-500" />
          <span>Auto-heal</span>
        </Badge>
      );
    }
    
    if (metadata.createVersion) {
      indicators.push(
        <Badge key="version" variant="outline" className="flex items-center space-x-1">
          <GitBranch className="h-3 w-3 text-green-500" />
          <span>Version</span>
        </Badge>
      );
    }

    return indicators;
  };

  return (
    <>
      {/* Generation Status - appears above input when generating */}
      {isGenerating && (
        <div className="fixed bottom-32 left-1/2 w-full max-w-2xl -translate-x-1/2 transform px-4 mb-4">
          <EnhancedGenerationStatus
            status={generationStatus || "Processing..."}
            progress={generationProgress}
            error={error}
            partialNodes={partialNodes}
            validationResult={validationResult}
            securityResult={securityResult}
            metrics={metrics}
          />
        </div>
      )}

      {/* Main Input */}
      <div className="fixed bottom-8 left-1/2 w-full max-w-2xl -translate-x-1/2 transform px-4">
        {(localError || error) && (
          <div className="mb-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            <p>{localError || error}</p>
          </div>
        )}
        
        <Card className="glass-morphism shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-2">
            {/* Status Indicators */}
            {!isGenerating && getStatusIndicators().length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mb-2 px-2 py-1">
                <span className="text-xs text-gray-500 mr-2">Active:</span>
                {getStatusIndicators()}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your automation workflow..."
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isGenerating}
              />

              {/* Advanced Settings */}
              <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      "flex-shrink-0",
                      showAdvanced && "bg-blue-50 border-blue-200"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Generation Options</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="domain-hint">Domain</Label>
                          <Select 
                            value={options.domainHint} 
                            onValueChange={(value) => updateOptions('domainHint', value)}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DOMAIN_HINTS.map(hint => (
                                <SelectItem key={hint.value} value={hint.value}>
                                  {hint.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="user-level">User Level</Label>
                          <Select 
                            value={options.userLevel} 
                            onValueChange={(value) => updateOptions('userLevel', value)}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USER_LEVELS.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="detailed-mode">Detailed Mode</Label>
                          <Switch
                            id="detailed-mode"
                            checked={options.detailedMode}
                            onCheckedChange={(checked) => updateOptions('detailedMode', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="prefill-config">Prefill Config</Label>
                          <Switch
                            id="prefill-config"
                            checked={options.prefillConfig}
                            onCheckedChange={(checked) => updateOptions('prefillConfig', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Safety & Quality</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <Label htmlFor="security">Security Validation</Label>
                          </div>
                          <Switch
                            id="security"
                            checked={options.enableSecurity}
                            onCheckedChange={(checked) => updateOptions('enableSecurity', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <Label htmlFor="validation">Workflow Validation</Label>
                          </div>
                          <Switch
                            id="validation"
                            checked={options.enableValidation}
                            onCheckedChange={(checked) => updateOptions('enableValidation', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-purple-500" />
                            <Label htmlFor="auto-heal">Auto-heal Issues</Label>
                          </div>
                          <Switch
                            id="auto-heal"
                            checked={options.autoHeal}
                            onCheckedChange={(checked) => updateOptions('autoHeal', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <GitBranch className="h-4 w-4 text-green-500" />
                            <Label htmlFor="create-version">Create Version</Label>
                          </div>
                          <Switch
                            id="create-version"
                            checked={metadata.createVersion}
                            onCheckedChange={(checked) => updateMetadata('createVersion', checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                type="submit" 
                size="sm" 
                disabled={!prompt.trim() || isGenerating}
                className="flex-shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SendHorizontal className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Quick Prompts */}
        {!isGenerating && prompt === "" && (
          <div className="mt-2 flex flex-wrap gap-1 justify-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6" 
              onClick={() => setPrompt("Create a DeFi yield farming workflow with automatic compound")}
            >
              <Star className="h-3 w-3 mr-1" />
              DeFi Farming
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6"
              onClick={() => setPrompt("Build an e-commerce order processing workflow with notifications")}
            >
              <Star className="h-3 w-3 mr-1" />
              E-commerce
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6"
              onClick={() => setPrompt("Create a social media content automation workflow")}
            >
              <Star className="h-3 w-3 mr-1" />
              Social Media
            </Button>
          </div>
        )}
      </div>
    </>
  );
}