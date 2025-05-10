"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Terminal, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CustomBlockDefinition } from "@/types/custom-block";

interface BlockSimulatorProps {
  block: CustomBlockDefinition;
  onClose: () => void;
  onFinalize: (block: CustomBlockDefinition) => void;
}

/**
 * Executes JavaScript logic for block simulation
 */
const executeJsLogic = (logic: string, inputs: Record<string, any>): Record<string, any> => {
  try {
    // Create safe execution environment
    const sandbox = {
      inputs,
      outputs: {},
      console: { log: console.log, error: console.error }
    };
    
    // Wrap the logic with a function
    const wrappedLogic = `
      (function(inputs, outputs) {
        try {
          ${logic}
          return outputs;
        } catch (error) {
          throw new Error("Execution error: " + error.message);
        }
      })(inputs, outputs);
    `;
    
    // Execute in a function context to isolate variables
    const result = new Function("inputs", "outputs", "console", `
      try {
        return ${wrappedLogic};
      } catch (error) {
        throw new Error("Execution error: " + error.message);
      }
    `)(sandbox.inputs, sandbox.outputs, sandbox.console);
    
    return result || {};
  } catch (error) {
    console.error("Error executing block logic:", error);
    throw error;
  }
};

export function BlockSimulator({ block, onClose, onFinalize }: BlockSimulatorProps) {
  const { toast } = useToast();
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [outputValues, setOutputValues] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{type: "info" | "error", message: string}>>([]);

  // Initialize input values from block definition
  useEffect(() => {
    const initialInputs: Record<string, any> = {};
    
    block.inputs?.forEach(input => {
      // Set default sample values based on type
      if (input.type === "string") {
        initialInputs[input.name] = input.defaultValue || "Sample text";
      } else if (input.type === "number") {
        initialInputs[input.name] = input.defaultValue || 42;
      } else if (input.type === "boolean") {
        initialInputs[input.name] = input.defaultValue || false;
      } else if (input.type === "object") {
        initialInputs[input.name] = input.defaultValue || { key: "value" };
      } else if (input.type === "array") {
        initialInputs[input.name] = input.defaultValue || [1, 2, 3];
      } else {
        initialInputs[input.name] = input.defaultValue || null;
      }
    });
    
    setInputValues(initialInputs);
  }, [block]);

  const handleInputChange = (name: string, value: any) => {
    setInputValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const simulateBlock = async () => {
    setIsRunning(true);
    setError(null);
    setLogs([]);
    
    try {
      // Capture console output
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (message: any) => {
        originalConsoleLog(message);
        setLogs(prev => [...prev, { type: "info", message: String(message) }]);
      };
      
      console.error = (message: any) => {
        originalConsoleError(message);
        setLogs(prev => [...prev, { type: "error", message: String(message) }]);
      };
      
      // Simulate block execution based on logic type
      let result: Record<string, any> = {};
      
      // For demo, we'll support JavaScript logic
      if (block.logicType === "javascript" || !block.logicType) {
        result = executeJsLogic(block.logic || "", inputValues);
      } else {
        throw new Error(`Logic type '${block.logicType}' is not supported yet`);
      }
      
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      setOutputValues(result);
      setHasRun(true);
      toast({
        title: "Simulation Completed",
        description: "Block executed successfully with the provided inputs."
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      toast({
        title: "Simulation Failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Simulate Block: {block.name}
        </CardTitle>
        <CardDescription>
          Test your block with sample inputs to see how it will behave in a real workflow
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Input Values</h3>
            {block.inputs?.map((input) => (
              <div key={input.name} className="space-y-2">
                <Label htmlFor={`input-${input.name}`}>
                  {input.name}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {input.type}
                  </Badge>
                </Label>
                {input.type === "string" ? (
                  <Input
                    id={`input-${input.name}`}
                    value={inputValues[input.name] || ""}
                    onChange={(e) => handleInputChange(input.name, e.target.value)}
                    placeholder={input.description || `Enter ${input.name}`}
                  />
                ) : input.type === "number" ? (
                  <Input
                    id={`input-${input.name}`}
                    type="number"
                    value={inputValues[input.name] || 0}
                    onChange={(e) => handleInputChange(input.name, Number(e.target.value))}
                    placeholder={input.description || `Enter ${input.name}`}
                  />
                ) : input.type === "text" || input.type === "json" ? (
                  <Textarea
                    id={`input-${input.name}`}
                    value={typeof inputValues[input.name] === "object" 
                      ? JSON.stringify(inputValues[input.name], null, 2) 
                      : inputValues[input.name] || ""}
                    onChange={(e) => {
                      try {
                        if (input.type === "json") {
                          handleInputChange(input.name, JSON.parse(e.target.value));
                        } else {
                          handleInputChange(input.name, e.target.value);
                        }
                      } catch {
                        // If JSON parsing fails, store as string
                        handleInputChange(input.name, e.target.value);
                      }
                    }}
                    placeholder={input.description || `Enter ${input.name}`}
                    rows={3}
                  />
                ) : (
                  <Input
                    id={`input-${input.name}`}
                    value={formatValue(inputValues[input.name])}
                    onChange={(e) => handleInputChange(input.name, e.target.value)}
                    placeholder={input.description || `Enter ${input.name}`}
                  />
                )}
                {input.description && (
                  <p className="text-xs text-muted-foreground">{input.description}</p>
                )}
              </div>
            ))}
            {(!block.inputs || block.inputs.length === 0) && (
              <div className="p-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">This block does not have any inputs.</p>
              </div>
            )}
          </div>
          
          {/* Output Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Output Values</h3>
            {hasRun ? (
              block.outputs?.map((output) => (
                <div key={output.name} className="space-y-2">
                  <Label>
                    {output.name}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {output.type}
                    </Badge>
                  </Label>
                  <div className="p-3 border rounded-md bg-muted/30 font-mono text-sm overflow-auto">
                    {outputValues[output.name] !== undefined ? (
                      <pre className="whitespace-pre-wrap break-all">
                        {formatValue(outputValues[output.name])}
                      </pre>
                    ) : (
                      <span className="text-muted-foreground">No output value</span>
                    )}
                  </div>
                  {output.description && (
                    <p className="text-xs text-muted-foreground">{output.description}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center p-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">Run the simulation to see output values</p>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Simulation Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Logs Panel */}
            {logs.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Execution Logs</h4>
                <ScrollArea className="h-[150px] p-3 border rounded-md bg-black text-white font-mono text-sm">
                  {logs.map((log, index) => (
                    <div key={index} className={log.type === "error" ? "text-red-400" : "text-green-400"}>
                      {log.message}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={simulateBlock} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Terminal className="h-4 w-4" />
            )}
            {isRunning ? "Running..." : "Run Simulation"}
          </Button>
          <Button 
            onClick={() => onFinalize(block)} 
            disabled={!hasRun}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Confirm &amp; Save
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
