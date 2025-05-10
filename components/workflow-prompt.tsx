"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Sparkles, FileText, Zap } from "lucide-react";
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
    id: 'defi-portfolio-management',
    name: 'DeFi Portfolio Management',
    description: 'Automate portfolio monitoring, rebalancing, and execution on Base Sepolia',
    category: 'defi'
  }
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
    className="inline-flex items-center rounded-full border border-input bg-background px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
  >
    {children}
  </button>
);

interface WorkflowPromptProps {
  onGenerate: (prompt: string, options: GenerationOptions) => void;
  isGenerating: boolean;
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
  className,
}: WorkflowPromptProps) => {
  const [nlPrompt, setNlPrompt] = useState<string>("");
  const [detailedMode, setDetailedMode] = useState<boolean>(true);
  const [prefillConfig, setPrefillConfig] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("crypto");
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [showExamplesPanel, setShowExamplesPanel] = useState<boolean>(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Update suggestions when category changes
  useEffect(() => {
    setPromptSuggestions(
      SUGGESTION_CATEGORIES[selectedCategory as keyof typeof SUGGESTION_CATEGORIES] || []
    );
  }, [selectedCategory]);

  const handleGenerate = () => {
    if ((!nlPrompt.trim() && !selectedTemplateId) || isGenerating) return;
    
    onGenerate(nlPrompt, {
      detailedMode,
      prefillConfig,
      domainHint: detectDomain(nlPrompt),
      templateId: selectedTemplateId,
      userId: ''
    });
  };

  // Simple domain detection based on keywords
  const detectDomain = (prompt: string): string | undefined => {
    const lowerPrompt = prompt.toLowerCase();
    
    if (/\b(crypto|bitcoin|eth|btc|blockchain|token|uniswap)\b/.test(lowerPrompt)) {
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

  const handleShowExamples = () => {
    setShowExamplesPanel(!showExamplesPanel);
    if (showTemplatesPanel) setShowTemplatesPanel(false);
  };

  const handleShowTemplates = () => {
    setShowTemplatesPanel(!showTemplatesPanel);
    if (showExamplesPanel) setShowExamplesPanel(false);
  };
  
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId === selectedTemplateId ? '' : templateId);
  };

  return (
    <div className={cn("workflow-prompt-container space-y-3", className)}>
      <div className="prompt-header flex justify-between items-center">
        <h3 className="text-sm font-medium">Describe Your Workflow</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleShowTemplates}>
            <FileText className="h-4 w-4 mr-1" />
            {showTemplatesPanel ? "Hide Templates" : "Templates"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShowExamples}>
            {showExamplesPanel ? "Hide Examples" : "See Examples"}
          </Button>
        </div>
      </div>
      
      <Textarea 
        placeholder="Describe your workflow in detail (e.g., 'Monitor ETH price every hour and send email when it crosses $3000')"
        className="min-h-[80px] resize-y"
        value={nlPrompt}
        onChange={(e) => {
          setNlPrompt(e.target.value);
          // Clear template selection when user types
          if (selectedTemplateId) setSelectedTemplateId('');
        }}
      />
      
      {showTemplatesPanel && (
        <div className="templates-panel border rounded-md p-3 bg-muted/30">
          <h4 className="text-sm font-medium mb-2">Available Templates</h4>
          <div className="grid gap-2">
            {TEMPLATES.map(template => (
              <div 
                key={template.id} 
                className={`p-2 border rounded-md cursor-pointer hover:bg-accent transition-colors ${selectedTemplateId === template.id ? 'bg-accent' : ''}`}
                onClick={() => handleSelectTemplate(template.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{template.name}</div>
                  {selectedTemplateId === template.id && (
                    <Zap className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showExamplesPanel && (
        <div className="examples-panel border rounded-md p-3 bg-muted/30">
          <Tabs defaultValue="crypto" onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-4 mb-2">
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="defi">DeFi</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedCategory} className="mt-0">
              <div className="suggestion-chips flex flex-wrap gap-2">
                {promptSuggestions.map(suggestion => (
                  <Chip key={suggestion} onClick={() => setNlPrompt(suggestion)}>
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
          disabled={isGenerating || (!nlPrompt.trim() && !selectedTemplateId)}
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
