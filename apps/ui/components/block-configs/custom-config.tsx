"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { BlockConfigComponentProps } from "@/lib/block-config-registry";
import { customBlockService } from "@/lib/services/custom-block-service";
import { CustomBlockDefinition, BlockParameter } from "@zzyra/types";

export function CustomConfig({
  config,
  onChange,
  executionStatus = "idle",
  onTest,
}: BlockConfigComponentProps) {
  console.log("CustomConfig component rendered with:", {
    config,
    executionStatus,
    hasOnChange: !!onChange,
    hasOnTest: !!onTest,
  });

  const [block, setBlock] = useState<CustomBlockDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, unknown>>({});

  // Load the custom block definition
  useEffect(() => {
    console.log("CustomConfig useEffect triggered with config:", config);

    const loadBlock = async () => {
      setLoading(true);
      try {
        // First check if we have the block in the config
        if (config.customBlockDefinition) {
          console.log("Using customBlockDefinition from config");
          setBlock(config.customBlockDefinition as CustomBlockDefinition);
          initializeValues(
            config.customBlockDefinition as CustomBlockDefinition
          );
          setLoading(false);
          return;
        }

        // Check if we have a customBlockId
        const customBlockId = config.customBlockId as string;
        if (!customBlockId) {
          console.warn("No customBlockId found in config");
          setLoading(false);
          return;
        }

        console.log("Loading custom block with ID:", customBlockId);

        // Try to load from database
        const blockData =
          await customBlockService.getCustomBlockById(customBlockId);
        if (blockData) {
          console.log("Found custom block in database:", blockData.name);
          setBlock(blockData);
          initializeValues(blockData);
        } else {
          // Try to find in example blocks
          const exampleBlocks = customBlockService.getExampleBlocks();
          const exampleBlock = exampleBlocks.find(
            (b) => b.id === customBlockId
          );

          if (exampleBlock) {
            console.log("Found custom block in examples:", exampleBlock.name);
            setBlock(exampleBlock);
            initializeValues(exampleBlock);
          } else {
            console.error("Custom block not found:", customBlockId);
          }
        }
      } catch (error) {
        console.error("Error loading custom block:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBlock();
  }, [config]);

  const initializeValues = (blockDef: CustomBlockDefinition) => {
    console.log("CustomConfig initializeValues called with:", {
      blockDef: blockDef.name,
      inputs: blockDef.inputs.length,
      config,
    });

    const initialValues: Record<string, unknown> = {};
    blockDef.inputs.forEach((input) => {
      const configValue = config[input.name];
      const defaultValue = input.defaultValue;
      const typeDefault = getDefaultValueForType(input.type);

      initialValues[input.name] =
        configValue !== undefined
          ? configValue
          : defaultValue !== undefined
            ? defaultValue
            : typeDefault;

      console.log(`Input ${input.name}:`, {
        configValue,
        defaultValue,
        typeDefault,
        finalValue: initialValues[input.name],
      });
    });

    console.log("Setting initial values:", initialValues);
    setValues(initialValues);
  };

  const getDefaultValueForType = (dataType: string): unknown => {
    switch (dataType) {
      case "string":
        return "";
      case "number":
        return 0;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        return {};
      default:
        return null;
    }
  };

  const handleValueChange = (fieldName: string, value: unknown) => {
    console.log("CustomConfig handleValueChange called:", {
      fieldName,
      value,
      currentValues: values,
    });

    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);

    // Update the config with the new values - only pass the config changes
    const newConfig = {
      ...newValues,
    };

    console.log("CustomConfig onChange called with:", newConfig);
    onChange(newConfig);
  };

  const renderInputField = (input: BlockParameter, index: number) => {
    const value = values[input.name];

    switch (input.type) {
      case "string":
        return (
          <Input
            id={`input-${index}`}
            value={String(value || "")}
            onChange={(e) => handleValueChange(input.name, e.target.value)}
            placeholder={`Enter ${input.name}`}
          />
        );
      case "number":
        return (
          <Input
            id={`input-${index}`}
            type='number'
            value={value !== undefined ? String(value) : ""}
            onChange={(e) =>
              handleValueChange(
                input.name,
                Number.parseFloat(e.target.value) || 0
              )
            }
            placeholder={`Enter ${input.name}`}
          />
        );
      case "boolean":
        return (
          <Switch
            id={`input-${index}`}
            checked={Boolean(value)}
            onCheckedChange={(checked) =>
              handleValueChange(input.name, checked)
            }
          />
        );
      case "object":
      case "array":
        return (
          <Textarea
            id={`input-${index}`}
            value={
              typeof value === "object" ? JSON.stringify(value, null, 2) : ""
            }
            onChange={(e) => {
              try {
                handleValueChange(input.name, JSON.parse(e.target.value));
              } catch (error) {
                // Allow invalid JSON during editing
                handleValueChange(input.name, e.target.value);
              }
            }}
            placeholder={`Enter ${input.name} as JSON`}
            rows={4}
            className='font-mono text-sm'
          />
        );
      default:
        return (
          <Input
            id={`input-${index}`}
            value={String(value || "")}
            onChange={(e) => handleValueChange(input.name, e.target.value)}
            placeholder={`Enter ${input.name}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center justify-center p-4'>
            <Loader2 className='h-4 w-4 animate-spin mr-2' />
            <span>Loading custom block...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!block) {
    return (
      <Card>
        <CardContent className='p-4'>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              Custom block not found. Please check the configuration.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Block Info */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <div className='w-5 h-5 bg-gray-100 rounded flex items-center justify-center'>
                <span className='text-xs'>🧩</span>
              </div>
              <CardTitle className='text-lg'>{block.name}</CardTitle>
            </div>
            <Badge variant='outline'>Custom Block</Badge>
          </div>
          {block.description && (
            <p className='text-sm text-muted-foreground'>{block.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Input Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Input Parameters</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {block.inputs.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              This custom block has no input parameters.
            </p>
          ) : (
            block.inputs.map((input, index) => (
              <div key={`${input.name}-${index}`} className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor={`input-${index}`} className='text-sm'>
                    {input.name}
                    {input.required && (
                      <span className='text-destructive ml-1'>*</span>
                    )}
                  </Label>
                  <Badge variant='outline' className='text-xs'>
                    {input.type}
                  </Badge>
                </div>
                {input.description && (
                  <p className='text-xs text-muted-foreground'>
                    {input.description}
                  </p>
                )}
                {renderInputField(input, index)}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Test Button */}
      {onTest && (
        <Card>
          <CardContent className='p-4'>
            <Button
              onClick={onTest}
              disabled={executionStatus === "running"}
              className='w-full'>
              {executionStatus === "running" ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  Testing...
                </>
              ) : (
                "Test Custom Block"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
