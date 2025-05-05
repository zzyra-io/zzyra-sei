"use client"

import { useState, useEffect } from "react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Plus, Trash2, PercentIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useToast } from "@/components/ui/use-toast"
import { mapWorkflowBlockToDefiBlock } from "@/lib/workflow/defi-block-mapper"
import { BlockType } from "@/types/workflow"

interface DefiRebalanceProps {
  node: any;
  onUpdate: (updatedNode: any) => void;
}

export function DefiRebalanceBlock({ node, onUpdate }: DefiRebalanceProps) {
  const { toast } = useToast();
  const [targetWeights, setTargetWeights] = useState<Record<string, number>>(
    node.data?.config?.targetWeights || { "ETH": 0.4, "BTC": 0.3, "USDC": 0.3 }
  );
  const [newAsset, setNewAsset] = useState("");
  const [newWeight, setNewWeight] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(
    Object.values(targetWeights).reduce((acc, val) => acc + val, 0)
  );

  const form = useForm({
    defaultValues: {
      targetWeights: node.data?.config?.targetWeights || { "ETH": 0.4, "BTC": 0.3, "USDC": 0.3 },
      rebalanceThreshold: node.data?.config?.rebalanceThreshold || 5,
      slippage: node.data?.config?.slippage || 0.5
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

  // Update total weight when targetWeights change
  useEffect(() => {
    const total = Object.values(targetWeights).reduce((acc, val) => acc + val, 0);
    setTotalWeight(total);
  }, [targetWeights]);

  // Asset weight management
  const addAssetWeight = () => {
    if (newAsset && !targetWeights[newAsset] && newWeight > 0) {
      const updatedWeights = { ...targetWeights, [newAsset]: newWeight };
      setTargetWeights(updatedWeights);
      form.setValue("targetWeights", updatedWeights);
      setNewAsset("");
      setNewWeight(0);
    }
  };

  const removeAssetWeight = (asset: string) => {
    const updatedWeights = { ...targetWeights };
    delete updatedWeights[asset];
    setTargetWeights(updatedWeights);
    form.setValue("targetWeights", updatedWeights);
  };

  const updateAssetWeight = (asset: string, weight: number) => {
    const updatedWeights = { ...targetWeights, [asset]: weight };
    setTargetWeights(updatedWeights);
    form.setValue("targetWeights", updatedWeights);
  };

  // Normalize weights to sum to 1
  const normalizeWeights = () => {
    if (totalWeight === 0) return;
    
    const normalizedWeights = Object.entries(targetWeights).reduce((acc, [asset, weight]) => {
      acc[asset] = weight / totalWeight;
      return acc;
    }, {} as Record<string, number>);
    
    setTargetWeights(normalizedWeights);
    form.setValue("targetWeights", normalizedWeights);
    
    toast({
      title: "Weights normalized",
      description: "Portfolio weights have been normalized to sum to 100%"
    });
  };

  const onSubmit = (data: any) => {
    const defiType = mapWorkflowBlockToDefiBlock(BlockType.DEFI_REBALANCE);
    
    // Normalize weights if they don't sum to 1 (or close to 1)
    if (Math.abs(totalWeight - 1) > 0.01) {
      normalizeWeights();
    }
    
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
      description: "Portfolio rebalancer settings have been saved."
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>Target Portfolio Allocation</span>
              <Badge variant={Math.abs(totalWeight - 1) > 0.01 ? "destructive" : "outline"}>
                Total: {(totalWeight * 100).toFixed(0)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="targetWeights"
              render={({ field }) => (
                <FormItem>
                  <FormDescription>
                    Set target percentage for each asset in your portfolio
                  </FormDescription>
                  
                  {Object.entries(targetWeights).map(([asset, weight]) => (
                    <div key={asset} className="flex items-center gap-4 my-4">
                      <Badge className="w-16 text-center">{asset}</Badge>
                      <div className="flex-1">
                        <Slider
                          value={[weight * 100]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) => updateAssetWeight(asset, value / 100)}
                        />
                      </div>
                      <div className="w-16 text-center">
                        {(weight * 100).toFixed(0)}%
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAssetWeight(asset)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2 mt-4">
                    <Select
                      onValueChange={setNewAsset}
                      value={newAsset}
                    >
                      <SelectTrigger className="w-1/3">
                        <SelectValue placeholder="Asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularAssets
                          .filter(asset => !Object.keys(targetWeights).includes(asset.value))
                          .map(asset => (
                            <SelectItem key={asset.value} value={asset.value}>
                              {asset.label} ({asset.value})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Weight %"
                        value={newWeight === 0 ? "" : newWeight * 100}
                        onChange={e => setNewWeight(Number(e.target.value) / 100)}
                      />
                      <span>%</span>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addAssetWeight}
                      disabled={!newAsset || newWeight <= 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {Math.abs(totalWeight - 1) > 0.01 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={normalizeWeights}
                      className="mt-2 w-full"
                    >
                      Normalize Weights to 100%
                    </Button>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <FormField
          control={form.control}
          name="rebalanceThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rebalance Threshold (%)</FormLabel>
              <FormDescription>
                Trigger rebalancing when asset allocation deviates from target by this percentage
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="20"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="slippage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Slippage (%)</FormLabel>
              <FormDescription>
                Maximum acceptable price slippage for swap operations
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
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
