"use client"

import { useState } from "react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { useToast } from "@/components/ui/use-toast"
import { mapWorkflowBlockToDefiBlock } from "@/lib/workflow/defi-block-mapper"
import { BlockType } from "@/types/workflow"

interface DefiGasOptimizerProps {
  node: any;
  onUpdate: (updatedNode: any) => void;
}

export function DefiGasOptimizerBlock({ node, onUpdate }: DefiGasOptimizerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("basic");

  const form = useForm({
    defaultValues: {
      gasLimit: node.data?.config?.gasLimit || 250000,
      maxFee: node.data?.config?.maxFee || 50,
      optimizationStrategy: node.data?.config?.optimizationStrategy || "gas_price",
      priorityLevel: node.data?.config?.priorityLevel || "medium",
      waitForOptimalGas: node.data?.config?.waitForOptimalGas || false,
      maxWaitTime: node.data?.config?.maxWaitTime || 120
    }
  });

  const onSubmit = (data: any) => {
    const defiType = mapWorkflowBlockToDefiBlock(BlockType.DEFI_GAS);
    
    // Update the node with the form data
    onUpdate({
      ...node,
      data: {
        ...node.data,
        config: {
          type: defiType,
          ...data
        }
      }
    });

    toast({
      title: "Configuration updated",
      description: "Gas optimizer settings have been saved."
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="optimizationStrategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optimization Strategy</FormLabel>
                  <FormDescription>
                    Choose how to optimize gas for your transactions
                  </FormDescription>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gas_price" id="r1" />
                        <Label htmlFor="r1">Gas Price</Label>
                        <span className="text-sm text-muted-foreground ml-2">
                          Target the lowest possible gas price
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="block_time" id="r2" />
                        <Label htmlFor="r2">Block Time</Label>
                        <span className="text-sm text-muted-foreground ml-2">
                          Optimize for block inclusion speed
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="network_load" id="r3" />
                        <Label htmlFor="r3">Network Load</Label>
                        <span className="text-sm text-muted-foreground ml-2">
                          Monitor network activity and execute during low congestion
                        </span>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priorityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority Level</FormLabel>
                  <FormDescription>
                    Set the priority level for transaction execution
                  </FormDescription>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low (Cheapest)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Fastest)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maxFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Gas Fee (Gwei)</FormLabel>
                  <FormDescription>
                    Maximum amount of gas fee you're willing to pay
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="500"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="gasLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gas Limit</FormLabel>
                  <FormDescription>
                    Maximum amount of gas units for the transaction
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min="21000"
                      step="1000"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="waitForOptimalGas"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      id="wait-for-optimal-gas"
                      title="Wait for optimal gas conditions"
                      aria-label="Wait for optimal gas conditions"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Wait for optimal gas conditions
                    </FormLabel>
                    <FormDescription>
                      The system will wait for favorable gas conditions before executing the transaction
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch("waitForOptimalGas") && (
              <FormField
                control={form.control}
                name="maxWaitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Wait Time (minutes)</FormLabel>
                    <FormDescription>
                      Maximum time to wait for optimal gas conditions
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="1440"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </TabsContent>
        </Tabs>
        
        <div className="pt-4 border-t flex justify-end">
          <Button type="submit">
            Save Configuration
          </Button>
        </div>
      </form>
    </Form>
  );
}
