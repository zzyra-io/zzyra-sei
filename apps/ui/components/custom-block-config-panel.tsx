"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import {
  type CustomBlockDefinition,
  type BlockParameter,
  DataType,
  NodeCategory,
} from "@zyra/types";
import { customBlockService } from "@/lib/services/custom-block-service";
import { useToast } from "@/components/ui/use-toast";

interface CustomBlockConfigPanelProps {
  blockId: string;
  config: Record<string, any>;
  onUpdate: (config: Record<string, any>) => void;
  onClose: () => void;
}

export function CustomBlockConfigPanel({
  blockId,
  config,
  onUpdate,
  onClose,
}: CustomBlockConfigPanelProps) {
  const [block, setBlock] = useState<CustomBlockDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, any>>({});
  const { toast } = useToast();

  // Load the custom block definition
  useEffect(() => {
    const loadBlock = async () => {
      setLoading(true);
      try {
        // First check if we have the block in the config
        if (config.customBlockDefinition) {
          setBlock(config.customBlockDefinition);

          // Initialize values from config or defaults
          const initialValues: Record<string, any> = {};
          config.customBlockDefinition.inputs.forEach((input) => {
            initialValues[input.name] =
              config[input.name] !== undefined
                ? config[input.name]
                : input.defaultValue !== undefined
                  ? input.defaultValue
                  : getDefaultValueForType(input.dataType);
          });
          setValues(initialValues);
          setLoading(false);
          return;
        }

        // Otherwise try to load from database
        const blockData = await customBlockService.getCustomBlockById(blockId);
        if (blockData) {
          setBlock(blockData);

          // Initialize values from config or defaults
          const initialValues: Record<string, any> = {};
          blockData.inputs.forEach((input) => {
            initialValues[input.name] =
              config[input.name] !== undefined
                ? config[input.name]
                : input.defaultValue !== undefined
                  ? input.defaultValue
                  : getDefaultValueForType(input.dataType);
          });
          setValues(initialValues);
        } else {
          // Try to find in example blocks
          const exampleBlocks = customBlockService.getExampleBlocks();
          const exampleBlock = exampleBlocks.find((b) => b.id === blockId);

          if (exampleBlock) {
            setBlock(exampleBlock);

            // Initialize values from config or defaults
            const initialValues: Record<string, any> = {};
            exampleBlock.inputs.forEach((input) => {
              initialValues[input.name] =
                config[input.name] !== undefined
                  ? config[input.name]
                  : input.defaultValue !== undefined
                    ? input.defaultValue
                    : getDefaultValueForType(input.dataType);
            });
            setValues(initialValues);
          } else {
            toast({
              title: "Block not found",
              description: "The custom block definition could not be loaded.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error loading custom block:", error);
        toast({
          title: "Error",
          description: "Failed to load custom block definition.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBlock();
  }, [blockId, config, toast]);

  // Get default value for a data type
  const getDefaultValueForType = (dataType: DataType): any => {
    switch (dataType) {
      case DataType.STRING:
        return "";
      case DataType.NUMBER:
        return 0;
      case DataType.BOOLEAN:
        return false;
      case DataType.OBJECT:
        return {};
      case DataType.ARRAY:
        return [];
      case DataType.ANY:
        return null;
      default:
        return null;
    }
  };

  // Handle value change
  const handleValueChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSave = () => {
    onUpdate(values);
    toast({
      title: "Configuration updated",
      description: "Custom block configuration has been updated.",
    });
  };

  // Render input field based on data type
  const renderInputField = (input: BlockParameter, index: number) => {
    const value = values[input.name];

    switch (input.dataType) {
      case DataType.STRING:
        return (
          <Input
            id={`input-${index}`}
            value={value || ""}
            onChange={(e) => handleValueChange(input.name, e.target.value)}
            placeholder={`Enter ${input.name}`}
          />
        );
      case DataType.NUMBER:
        return (
          <Input
            id={`input-${index}`}
            type='number'
            value={value !== undefined ? value : ""}
            onChange={(e) =>
              handleValueChange(
                input.name,
                Number.parseFloat(e.target.value) || 0
              )
            }
            placeholder={`Enter ${input.name}`}
          />
        );
      case DataType.BOOLEAN:
        return (
          <Switch
            id={`input-${index}`}
            checked={!!value}
            onCheckedChange={(checked) =>
              handleValueChange(input.name, checked)
            }
          />
        );
      case DataType.OBJECT:
      case DataType.ARRAY:
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
            value={value !== undefined ? String(value) : ""}
            onChange={(e) => handleValueChange(input.name, e.target.value)}
            placeholder={`Enter ${input.name}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className='w-80 border-l h-full p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='font-medium'>Custom Block Configuration</h3>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex justify-center items-center h-40'>
          <p className='text-muted-foreground'>Loading block definition...</p>
        </div>
      </div>
    );
  }

  if (!block) {
    return (
      <div className='w-80 border-l h-full p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='font-medium'>Custom Block Configuration</h3>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex justify-center items-center h-40'>
          <p className='text-muted-foreground'>Block definition not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className='w-80 border-l h-full flex flex-col'>
      <div className='p-4 border-b'>
        <div className='flex justify-between items-center'>
          <h3 className='font-medium'>{block.name}</h3>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
        <p className='text-sm text-muted-foreground mt-1'>
          {block.description}
        </p>
      </div>

      <ScrollArea className='flex-1'>
        <div className='p-4 space-y-6'>
          <div>
            <h4 className='text-sm font-medium mb-3'>Input Parameters</h4>
            <div className='space-y-4'>
              {block.inputs.map((input, index) => (
                <div key={input.id} className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label htmlFor={`input-${index}`} className='text-sm'>
                      {input.name}
                      {input.required && (
                        <span className='text-destructive ml-1'>*</span>
                      )}
                    </Label>
                    <Badge variant='outline' className='text-xs'>
                      {input.dataType}
                    </Badge>
                  </div>
                  {input.description && (
                    <p className='text-xs text-muted-foreground'>
                      {input.description}
                    </p>
                  )}
                  {renderInputField(input, index)}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className='text-sm font-medium mb-3'>Output Parameters</h4>
            <Card>
              <CardHeader className='py-3 px-4'>
                <CardTitle className='text-sm font-medium'>
                  Expected Outputs
                </CardTitle>
              </CardHeader>
              <CardContent className='py-2 px-4'>
                <ul className='space-y-2'>
                  {block.outputs.map((output) => (
                    <li key={output.id} className='text-sm'>
                      <div className='flex items-center justify-between'>
                        <span>{output.name}</span>
                        <Badge variant='outline' className='text-xs'>
                          {output.dataType}
                        </Badge>
                      </div>
                      {output.description && (
                        <p className='text-xs text-muted-foreground'>
                          {output.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>

      <div className='p-4 border-t'>
        <Button onClick={handleSave} className='w-full'>
          Apply Configuration
        </Button>
      </div>
    </div>
  );
}
