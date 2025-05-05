import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getUserBlockLibrary } from '@/lib/block-library-api';
import { BlockLibraryEntry } from '@/types/block-library';
import { Loader2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Schema for the configuration form
const configFormSchema = z.object({
  customBlockId: z.string({
    required_error: "Please select a custom block",
  }),
  // Support for both simple string values and complex JSON objects
  inputs: z.record(z.union([
    z.string(),
    z.object({}).passthrough(), // Allow any JSON object structure
    z.array(z.any())           // Allow array structures
  ])),
});

// Type for the form values
type ConfigFormValues = z.infer<typeof configFormSchema>;

// Import the BlockInputValue type from modal component
import { BlockInputValue } from './custom-block-config-modal';

interface CustomBlockConfigProps {
  onSave: (config: {
    customBlockId: string;
    inputs: Record<string, BlockInputValue>;
  }) => void;
  initialBlockId?: string;
  initialInputs?: Record<string, BlockInputValue>;
}

export function CustomBlockConfig({ onSave, initialBlockId, initialInputs = {} }: CustomBlockConfigProps) {
  const [blocks, setBlocks] = useState<BlockLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<BlockLibraryEntry | null>(null);
  
  // Form setup
  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      customBlockId: initialBlockId || '',
      inputs: initialInputs || {},
    },
  });
  
  // Load blocks from library
  useEffect(() => {
    async function loadBlocks() {
      try {
        setLoading(true);
        const result = await getUserBlockLibrary();
        const allBlocks = [
          ...result.userBlocks,
          ...result.sharedBlocks,
          ...result.verifiedBlocks
        ];
        setBlocks(allBlocks);
        
        // If initialBlockId is provided, find and set the selected block
        if (initialBlockId) {
          const selected = allBlocks.find(block => block.id === initialBlockId);
          if (selected) {
            setSelectedBlock(selected);
          }
        }
      } catch (error) {
        console.error('Failed to load block library:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadBlocks();
  }, [initialBlockId]);
  
  // Handle block selection change
  const handleBlockChange = (blockId: string) => {
    const selected = blocks.find(block => block.id === blockId);
    setSelectedBlock(selected || null);
    
    // Update form value
    form.setValue('customBlockId', blockId);
    
    // Reset inputs when block changes, but preserve any initial inputs
    const newInputs: Record<string, BlockInputValue> = {};
    if (selected && selected.blockData.inputs) {
      selected.blockData.inputs.forEach(input => {
        // If an initial value exists for this input, keep it
        const initialValue = initialInputs[input.name];
        newInputs[input.name] = initialValue !== undefined ? initialValue : '';
      });
    }
    form.setValue('inputs', newInputs);
  };
  
  // Handle form submission
  const onSubmit = (data: ConfigFormValues) => {
    onSave(data);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Custom Block Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customBlockId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Custom Block</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleBlockChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a custom block" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading blocks...</span>
                        </div>
                      ) : (
                        blocks.map((block) => (
                          <SelectItem key={block.id} value={block.id}>
                            {block.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedBlock && selectedBlock.blockData.inputs && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Input Configuration</h3>
                {selectedBlock.blockData.inputs.map((input, index) => (
                  <FormField
                    key={`${input.name}-${index}`}
                    control={form.control}
                    name={`inputs.${input.name}`}
                    render={({ field }) => {
                      // Determine if this might be a complex input that could use JSON
                      const mightBeComplex = input.name.toLowerCase().includes('config') || 
                                            input.name.toLowerCase().includes('options') || 
                                            input.name.toLowerCase().includes('parameters') ||
                                            input.description?.toLowerCase().includes('json');

                      // If the field value is an object or array, convert it to string for display
                      const isComplexValue = typeof field.value === 'object' && field.value !== null;
                      const stringValue = isComplexValue 
                        ? JSON.stringify(field.value, null, 2) 
                        : String(field.value || '');
                    
                      return (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormLabel>
                              {input.name}
                              {input.required && <span className="text-red-500 ml-1">*</span>}
                            </FormLabel>
                            {mightBeComplex && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="w-[200px] text-sm">This field may accept JSON values for advanced configuration</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          
                          {mightBeComplex ? (
                            <Tabs defaultValue="simple" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="simple">Simple Value</TabsTrigger>
                                <TabsTrigger value="json">JSON Configuration</TabsTrigger>
                              </TabsList>
                              <TabsContent value="simple">
                                <FormControl>
                                  <Input
                                    value={isComplexValue ? '' : String(field.value || '')}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder={input.description || `Enter ${input.name}`}
                                  />
                                </FormControl>
                              </TabsContent>
                              <TabsContent value="json">
                                <FormControl>
                                  <Textarea
                                    className="font-mono text-sm h-[100px]"
                                    value={stringValue}
                                    onChange={(e) => {
                                      try {
                                        // Try to parse as JSON if possible
                                        const parsed = JSON.parse(e.target.value);
                                        field.onChange(parsed);
                                      } catch {
                                        // If not valid JSON, just store as string
                                        field.onChange(e.target.value);
                                      }
                                    }}
                                    placeholder={`{
  "key": "value"
}`}
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground mt-1">Enter valid JSON format for complex configurations</p>
                              </TabsContent>
                            </Tabs>
                          ) : (
                            <FormControl>
                              <Input
                                value={typeof field.value === 'string' ? field.value : ''}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                placeholder={input.description || `Enter ${input.name}`}
                              />
                            </FormControl>
                          )}
                          <p className="text-xs text-gray-500">{input.description}</p>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                  />
                ))}
              </div>
            )}
            
            <CardFooter className="px-0 pt-4">
              <Button type="submit" disabled={loading || !selectedBlock}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
