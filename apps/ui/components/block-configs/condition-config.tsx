"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface ConditionConfigProps {
  config: any;
  onChange: (config: any) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastResponse?: Record<string, unknown>;
  };
  onTest?: () => void;
}

export function ConditionConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
}: ConditionConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Info className='h-4 w-4' />
            Condition Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='condition'>Condition Expression</Label>
            <Textarea
              id='condition'
              placeholder='Enter JavaScript condition (e.g., data.price > 100)'
              value={config.condition || ""}
              onChange={(e) => handleChange("condition", e.target.value)}
              rows={4}
              className='font-mono text-sm'
            />
            <p className='text-xs text-muted-foreground'>
              Use JavaScript expressions to evaluate conditions. Access data
              from previous blocks using the "data" variable.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description (Optional)</Label>
            <Input
              id='description'
              placeholder='Describe what this condition checks for'
              value={config.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {executionStatus === "error" && executionData?.error && (
        <Alert variant='destructive'>
          <AlertDescription>
            Execution failed: {executionData.error}
          </AlertDescription>
        </Alert>
      )}

      {executionStatus === "success" && executionData?.lastResponse && (
        <Alert>
          <AlertDescription>
            Last execution result:{" "}
            {JSON.stringify(executionData.lastResponse, null, 2)}
          </AlertDescription>
        </Alert>
      )}

      <div className='text-xs text-muted-foreground space-y-2'>
        <h4 className='font-medium'>Examples:</h4>
        <ul className='space-y-1 list-disc list-inside'>
          <li>
            <code>data.price &gt; 100</code> - Check if price is above 100
          </li>
          <li>
            <code>data.balance &gt;= 50</code> - Check if balance is 50 or more
          </li>
          <li>
            <code>data.status === &apos;active&apos;</code> - Check if status is
            active
          </li>
          <li>
            <code>data.items.length &gt; 0</code> - Check if items array is not
            empty
          </li>
          <li>
            <code>
              data.temperature &gt; 25 &amp;&amp; data.humidity &lt; 60
            </code>{" "}
            - Complex condition
          </li>
        </ul>
      </div>
    </div>
  );
}
