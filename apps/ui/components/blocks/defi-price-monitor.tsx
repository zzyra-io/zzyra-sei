"use client"

import { useState, useEffect } from "react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useToast } from "@/components/ui/use-toast"
import { mapWorkflowBlockToDefiBlock } from "@/lib/workflow/defi-block-mapper"
import { BlockType } from "@/types/workflow"
import { BlockType } from '@zyra/types';


interface DefiPriceMonitorProps {
  node: any;
  onUpdate: (updatedNode: any) => void;
}

export function DefiPriceMonitorBlock({ node, onUpdate }: DefiPriceMonitorProps) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<string[]>(node.data?.config?.assets || ["ETH", "BTC"]);
  const [newAsset, setNewAsset] = useState("");

  const form = useForm({
    defaultValues: {
      assets: node.data?.config?.assets || ["ETH", "BTC"],
      threshold: node.data?.config?.threshold || 5,
      monitoringInterval: node.data?.config?.monitoringInterval || 15
    }
  });

  const popularAssets = [
    { value: "ETH", label: "Ethereum" },
    { value: "BTC", label: "Bitcoin" },
    { value: "USDC", label: "USD Coin" },
    { value: "DAI", label: "Dai" },
    { value: "LINK", label: "Chainlink" },
    { value: "UNI", label: "Uniswap" },
    { value: "AAVE", label: "Aave" },
    { value: "MKR", label: "Maker" },
  ];

  const addAsset = () => {
    if (newAsset && !assets.includes(newAsset)) {
      const updatedAssets = [...assets, newAsset];
      setAssets(updatedAssets);
      form.setValue("assets", updatedAssets);
      setNewAsset("");
    }
  };

  const removeAsset = (asset: string) => {
    const updatedAssets = assets.filter(a => a !== asset);
    setAssets(updatedAssets);
    form.setValue("assets", updatedAssets);
  };

  const onSubmit = (data: any) => {
    const defiType = mapWorkflowBlockToDefiBlock(BlockType.DEFI_PRICE_MONITOR);
    
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
      description: "Price monitor settings have been saved."
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="assets"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assets to Monitor</FormLabel>
              <FormDescription>
                Select cryptocurrencies to monitor price changes
              </FormDescription>
              
              <div className="flex flex-wrap gap-2 my-2">
                {assets.map(asset => (
                  <Badge key={asset} variant="secondary" className="flex items-center gap-1">
                    {asset}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeAsset(asset)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Select
                  onValueChange={setNewAsset}
                  value={newAsset}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularAssets.map(asset => (
                      <SelectItem key={asset.value} value={asset.value}>
                        {asset.label} ({asset.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAsset}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price Change Threshold (%)</FormLabel>
              <FormDescription>
                Trigger when price changes by this percentage
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="monitoringInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monitoring Interval (minutes)</FormLabel>
              <FormDescription>
                How often to check for price changes
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="pt-4 border-t flex justify-end">
          <Button type="submit">
            Save Configuration
          </Button>
        </div>
      </form>
    </Form>
  );
}
