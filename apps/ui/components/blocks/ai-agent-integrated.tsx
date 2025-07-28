"use client";
import { useState, useEffect } from "react";
import { AIAgentBlock } from "./ai-agent-block";
import { AIAgentExecutionPanel } from "./ai-agent-execution";
import { AIAgentAPI } from "@/lib/api/ai-agent";
import { AIAgentConfig, AIAgentExecution } from "@zyra/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Settings } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AIAgentIntegratedProps {
  initialConfig?: AIAgentConfig;
  onConfigChange?: (config: AIAgentConfig) => void;
  onExecutionComplete?: (result: string) => void;
}

export function AIAgentIntegrated({
  initialConfig,
  onConfigChange,
  onExecutionComplete,
}: AIAgentIntegratedProps) {
  const [config, setConfig] = useState<AIAgentConfig>(
    initialConfig || {
      provider: {
        type: "openrouter",
        model: "openai/gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 2000,
      },
      agent: {
        name: "AI Assistant",
        systemPrompt:
          "You are a helpful AI assistant with access to various tools. Always explain what you are doing and why.",
        userPrompt: "",
        maxSteps: 10,
        thinkingMode: "deliberate",
      },
      selectedTools: [],
      execution: {
        mode: "autonomous",
        timeout: 120000,
        requireApproval: false,
        saveThinking: true,
      },
    }
  );

  const [execution, setExecution] = useState<AIAgentExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const handleConfigChange = (newConfig: AIAgentConfig) => {
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const executeAgent = async () => {
    if (!config.agent.userPrompt.trim()) {
      toast({
        title: "Please enter a user prompt",
        variant: "destructive",
      });
      return;
    }

    if (config.selectedTools.length === 0) {
      toast({
        title: "Please select at least one tool",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExecuting(true);

      // Start execution
      const { executionId } = await AIAgentAPI.executeAgent(config);

      // Set initial execution state
      setExecution({
        id: executionId,
        status: "running",
        sessionId: executionId,
        startTime: new Date(),
        steps: [],
        toolCalls: [],
      });

      // Setup real-time updates
      const source = AIAgentAPI.createExecutionStream(executionId);
      setEventSource(source);

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data) {
            setExecution(data);

            // Check if execution completed
            if (data.status === "completed" || data.status === "failed") {
              source.close();
              setEventSource(null);
              setIsExecuting(false);

              if (data.status === "completed" && data.result) {
                onExecutionComplete?.(data.result);
                toast({
                  title: "AI Agent execution completed",
                  variant: "default",
                });
              } else if (data.status === "failed") {
                toast({
                  title: `Execution failed: ${data.error}`,
                  variant: "destructive",
                });
              }
            }
          }
        } catch (error) {
          console.error("Error parsing execution update:", error);
        }
      };

      source.onerror = (error) => {
        console.error("EventSource error:", error);
        source.close();
        setEventSource(null);
        setIsExecuting(false);
        toast({
          title: "Connection to execution stream lost",
          variant: "destructive",
        });
      };
    } catch (error) {
      setIsExecuting(false);
      toast({
        title: error instanceof Error ? error.message : "Execution failed",
        variant: "destructive",
      });
    }
  };

  const stopExecution = async () => {
    if (execution && execution.status === "running") {
      try {
        await AIAgentAPI.stopExecution(execution.id);
        if (eventSource) {
          eventSource.close();
          setEventSource(null);
        }
        setIsExecuting(false);
        toast({
          title: "Execution stopped",
          variant: "default",
        });
      } catch (error) {
        console.error("Failed to stop execution:", error);
        toast({
          title: "Failed to stop execution",
          variant: "destructive",
        });
      }
    }
  };

  const retryExecution = () => {
    setExecution(null);
    executeAgent();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const canExecute =
    config.agent.userPrompt.trim() && config.selectedTools.length > 0;

  return (
    <div className='w-full space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='h-5 w-5' />
              AI Agent Configuration & Execution
            </CardTitle>
            <Button
              onClick={executeAgent}
              disabled={!canExecute || isExecuting}
              className='flex items-center gap-2'>
              <Play className='h-4 w-4' />
              {isExecuting ? "Executing..." : "Execute Agent"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='config' className='w-full'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='config'>Configuration</TabsTrigger>
              <TabsTrigger value='execution'>Execution</TabsTrigger>
            </TabsList>

            <TabsContent value='config' className='space-y-4'>
              <AIAgentBlock config={config} onChange={handleConfigChange} />
            </TabsContent>

            <TabsContent value='execution' className='space-y-4'>
              <AIAgentExecutionPanel
                execution={execution}
                onStop={stopExecution}
                onRetry={retryExecution}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
