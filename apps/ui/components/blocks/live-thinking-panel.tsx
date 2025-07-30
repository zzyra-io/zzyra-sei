"use client";

import { cn } from "@/lib/utils";
import {
  Brain,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Terminal,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Utility functions
const formatTimestamp = (timestamp: string | Date) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case "running":
      return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
    case "completed":
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case "failed":
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return <Clock className="w-3 h-3 text-gray-400" />;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "reasoning":
      return <Brain className="w-3 h-3 text-purple-500" />;
    case "tool_call":
      return <Zap className="w-3 h-3 text-blue-500" />;
    case "tool_result":
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case "observation":
      return <Eye className="w-3 h-3 text-orange-500" />;
    case "conclusion":
      return <CheckCircle className="w-3 h-3 text-emerald-500" />;
    default:
      return <Terminal className="w-3 h-3 text-gray-500" />;
  }
};

// Types for thinking data structures
export interface ThinkingStep {
  id?: string;
  type: "reasoning" | "tool_call" | "tool_result" | "observation" | "conclusion";
  content: string;
  timestamp: string | Date;
  reasoning?: string;
  tool?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  status?: "pending" | "running" | "completed" | "failed";
  duration?: number;
}

export interface ToolCall {
  id: string;
  tool: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "running" | "completed" | "failed";
  timestamp: string | Date;
  duration?: number;
  error?: string;
}

export interface ExecutionLog {
  id: string;
  timestamp: string | Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  nodeId?: string;
  context?: Record<string, unknown>;
}

export interface LiveThinkingPanelProps {
  nodeId: string;
  thinkingSteps?: ThinkingStep[];
  toolCalls?: ToolCall[];
  logs?: ExecutionLog[];
  isThinking?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "failed";
  className?: string;
  defaultExpanded?: boolean;
  showTimestamps?: boolean;
  maxHeight?: string;
}

const LiveThinkingPanel = memo(({
  thinkingSteps = [],
  toolCalls = [],
  logs = [],
  isThinking = false,
  className,
  defaultExpanded = false,
  showTimestamps = true,
  maxHeight = "400px",
}: LiveThinkingPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState("thinking");
  const [isVisible, setIsVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastStepCountRef = useRef(thinkingSteps.length);

  // Auto-scroll to bottom when new thinking steps arrive
  useEffect(() => {
    if (thinkingSteps.length > lastStepCountRef.current && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    lastStepCountRef.current = thinkingSteps.length;
  }, [thinkingSteps.length]);

  // Auto-expand when thinking starts
  useEffect(() => {
    if (isThinking && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isThinking, isExpanded]);

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


  const totalItems = thinkingSteps.length + toolCalls.length + logs.length;

  if (!isVisible || totalItems === 0) {
    return null;
  }

  return (
    <div className={cn("border rounded-lg bg-card", className)}>
      {/* Panel Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-3 h-auto font-medium"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span>Live AI Thinking</span>
              {isThinking && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              )}
              <Badge variant="secondary" className="text-xs">
                {totalItems}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="p-1 h-auto"
              >
                <EyeOff className="w-3 h-3" />
              </Button>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                <TabsTrigger value="thinking" className="text-xs">
                  Thinking ({thinkingSteps.length})
                </TabsTrigger>
                <TabsTrigger value="tools" className="text-xs">
                  Tools ({toolCalls.length})
                </TabsTrigger>
                <TabsTrigger value="logs" className="text-xs">
                  Logs ({logs.length})
                </TabsTrigger>
              </TabsList>

              {/* Thinking Steps Tab */}
              <TabsContent value="thinking" className="m-0">
                <ScrollArea style={{ maxHeight }} className="p-3">
                  <div className="space-y-3" ref={scrollRef}>
                    {thinkingSteps.map((step, index) => (
                      <ThinkingStepDisplay
                        key={step.id || index}
                        step={step}
                        showTimestamps={showTimestamps}
                        onCopy={copyToClipboard}
                      />
                    ))}
                    {thinkingSteps.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No thinking steps yet
                        {isThinking && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>AI is thinking...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tool Calls Tab */}
              <TabsContent value="tools" className="m-0">
                <ScrollArea style={{ maxHeight }} className="p-3">
                  <div className="space-y-3">
                    {toolCalls.map((toolCall, index) => (
                      <ToolCallDisplay
                        key={toolCall.id || index}
                        toolCall={toolCall}
                        showTimestamps={showTimestamps}
                        onCopy={copyToClipboard}
                      />
                    ))}
                    {toolCalls.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No tool calls yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="m-0">
                <ScrollArea style={{ maxHeight }} className="p-3">
                  <div className="space-y-2 font-mono text-xs">
                    {logs.map((log, index) => (
                      <div
                        key={log.id || index}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded border",
                          log.level === "error"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : log.level === "warn"
                            ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                            : log.level === "debug"
                            ? "bg-gray-50 border-gray-200 text-gray-600"
                            : "bg-blue-50 border-blue-200 text-blue-700"
                        )}
                      >
                        <div className="flex-1">
                          {showTimestamps && (
                            <span className="text-xs opacity-60 mr-2">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          )}
                          {log.message}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(log.message)}
                          className="p-1 h-auto opacity-50 hover:opacity-100"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No logs yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

// Individual Thinking Step Component
const ThinkingStepDisplay = memo(({
  step,
  showTimestamps,
  onCopy,
}: {
  step: ThinkingStep;
  showTimestamps: boolean;
  onCopy: (text: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-start gap-3 p-3">
        <div className="flex items-center gap-2 mt-0.5">
          {getTypeIcon(step.type)}
          {getStatusIcon(step.status)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs capitalize">
              {step.type.replace("_", " ")}
            </Badge>
            {showTimestamps && (
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(step.timestamp)}
              </span>
            )}
            {step.duration && (
              <span className="text-xs text-muted-foreground">
                {step.duration}ms
              </span>
            )}
          </div>
          
          <div className="text-sm">
            {step.content.length > 200 ? (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <div>
                  {step.content.substring(0, 200)}...
                  <CollapsibleTrigger asChild>
                    <Button variant="link" size="sm" className="p-0 h-auto ml-1">
                      {isExpanded ? "Show less" : "Show more"}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="mt-2">
                    {step.content.substring(200)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              step.content
            )}
          </div>
          
          {/* Additional data for tool calls and results */}
          {step.tool && (
            <div className="mt-2 text-xs text-muted-foreground">
              <strong>Tool:</strong> {step.tool}
            </div>
          )}
          
          {step.parameters && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer text-muted-foreground">
                Parameters
              </summary>
              <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(step.parameters, null, 2)}
              </pre>
            </details>
          )}
          
          {step.result && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer text-muted-foreground">
                Result
              </summary>
              <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                {typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(step.content)}
          className="p-1 h-auto opacity-50 hover:opacity-100"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
});

// Tool Call Display Component
const ToolCallDisplay = memo(({
  toolCall,
  showTimestamps,
  onCopy,
}: {
  toolCall: ToolCall;
  showTimestamps: boolean;
  onCopy: (text: string) => void;
}) => {
  return (
    <div className="border rounded-lg bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-blue-500" />
        <Badge variant="outline" className="text-xs">
          {toolCall.tool}
        </Badge>
        {getStatusIcon(toolCall.status)}
        {showTimestamps && (
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(toolCall.timestamp)}
          </span>
        )}
        {toolCall.duration && (
          <span className="text-xs text-muted-foreground">
            {toolCall.duration}ms
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(JSON.stringify(toolCall, null, 2))}
          className="p-1 h-auto opacity-50 hover:opacity-100 ml-auto"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      
      {Object.keys(toolCall.parameters).length > 0 && (
        <details className="mb-2">
          <summary className="text-xs cursor-pointer text-muted-foreground">
            Parameters
          </summary>
          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(toolCall.parameters, null, 2)}
          </pre>
        </details>
      )}
      
      {toolCall.result && (
        <details>
          <summary className="text-xs cursor-pointer text-muted-foreground">
            Result
          </summary>
          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
            {typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </details>
      )}
      
      {toolCall.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Error:</strong> {toolCall.error}
        </div>
      )}
    </div>
  );
});


LiveThinkingPanel.displayName = "LiveThinkingPanel";
ThinkingStepDisplay.displayName = "ThinkingStepDisplay";
ToolCallDisplay.displayName = "ToolCallDisplay";

export default LiveThinkingPanel;