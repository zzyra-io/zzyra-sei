"use client"

import { useState, useEffect } from "react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Wallet } from "lucide-react"
import { useForm } from "react-hook-form"
import { useToast } from "@/components/ui/use-toast"
import { mapWorkflowBlockToDefiBlock } from "@/lib/workflow/defi-block-mapper"
import { BlockType } from "@/types/workflow"
import { useWeb3 } from "@/components/web3/web3-provider"
import { Checkbox } from "@/components/ui/checkbox"
import { BlockType } from '@zyra/types';


interface DefiPortfolioProps {
  node: any;
  onUpdate: (updatedNode: any) => void;
}

export function DefiPortfolioBlock({ node, onUpdate }: DefiPortfolioProps) {
  const { toast } = useToast();
  const { wallet, supportedChains } = useWeb3();
  const [assets, setAssets] = useState<string[]>(node.data?.config?.assets || ["ETH", "BTC", "USDC"]);
  const [protocols, setProtocols] = useState<string[]>(node.data?.config?.protocols || ["aave", "compound"]);
  const [newAsset, setNewAsset] = useState("");
  const [newProtocol, setNewProtocol] = useState("");
  const [customWallets, setCustomWallets] = useState<string[]>(node.data?.config?.customWallets || []);
  const [newCustomWallet, setNewCustomWallet] = useState("");
  const [useConnectedWallet, setUseConnectedWallet] = useState<boolean>(
    node.data?.config?.useConnectedWallet !== undefined 
      ? node.data?.config?.useConnectedWallet 
      : true
  );

  const form = useForm({
    defaultValues: {
      assets: node.data?.config?.assets || ["ETH", "BTC", "USDC"],
      protocols: node.data?.config?.protocols || ["aave", "compound"],
      monitoringInterval: node.data?.config?.monitoringInterval || 60,
      customWallets: node.data?.config?.customWallets || [],
      useConnectedWallet: node.data?.config?.useConnectedWallet !== undefined 
        ? node.data?.config?.useConnectedWallet 
        : true
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

  const popularProtocols = [
    { value: "aave", label: "Aave" },
    { value: "compound", label: "Compound" },
    { value: "uniswap", label: "Uniswap" },
    { value: "curve", label: "Curve Finance" },
    { value: "balancer", label: "Balancer" },
    { value: "yearn", label: "Yearn Finance" },
    { value: "maker", label: "MakerDAO" },
    { value: "convex", label: "Convex Finance" },
  ];

  // Update form when connected wallet changes
  useEffect(() => {
    if (wallet?.address && useConnectedWallet) {
      const updatedWallets = [...customWallets];
      if (!updatedWallets.includes(wallet.address)) {
        // Don't add duplicate wallets
        setCustomWallets(updatedWallets);
        form.setValue("customWallets", updatedWallets);
      }
    }
  }, [wallet?.address, useConnectedWallet]);

  // Asset management
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

  // Protocol management
  const addProtocol = () => {
    if (newProtocol && !protocols.includes(newProtocol)) {
      const updatedProtocols = [...protocols, newProtocol];
      setProtocols(updatedProtocols);
      form.setValue("protocols", updatedProtocols);
      setNewProtocol("");
    }
  };

  const removeProtocol = (protocol: string) => {
    const updatedProtocols = protocols.filter(p => p !== protocol);
    setProtocols(updatedProtocols);
    form.setValue("protocols", updatedProtocols);
  };

  // Custom wallet management
  const addCustomWallet = () => {
    if (newCustomWallet && 
        !customWallets.includes(newCustomWallet) && 
        newCustomWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      const updatedWallets = [...customWallets, newCustomWallet];
      setCustomWallets(updatedWallets);
      form.setValue("customWallets", updatedWallets);
      setNewCustomWallet("");
    } else {
      toast({
        title: "Invalid wallet address",
        description: "Please enter a valid Ethereum address starting with 0x.",
        variant: "destructive"
      });
    }
  };

  const removeCustomWallet = (wallet: string) => {
    const updatedWallets = customWallets.filter(w => w !== wallet);
    setCustomWallets(updatedWallets);
    form.setValue("customWallets", updatedWallets);
  };

  const onSubmit = (data: any) => {
    const defiType = mapWorkflowBlockToDefiBlock(BlockType.DEFI_PORTFOLIO);
    
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
      description: "Portfolio tracker settings have been saved."
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="useConnectedWallet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setUseConnectedWallet(checked as boolean);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Use connected wallet
                    </FormLabel>
                    <FormDescription>
                      Track the currently connected wallet ({wallet?.address ? 
                        wallet.address.substring(0, 6) + '...' + wallet.address.substring(wallet.address.length - 4) : 
                        'None'})
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customWallets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Wallets</FormLabel>
                  <FormDescription>
                    Add additional wallets to track
                  </FormDescription>
                  
                  <div className="flex flex-wrap gap-2 my-2">
                    {customWallets.map(wallet => (
                      <Badge key={wallet} variant="secondary" className="flex items-center gap-1">
                        <Wallet className="h-3 w-3 mr-1" />
                        {wallet.substring(0, 6) + '...' + wallet.substring(wallet.length - 4)}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => removeCustomWallet(wallet)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="0x..."
                      value={newCustomWallet}
                      onChange={(e) => setNewCustomWallet(e.target.value)}
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomWallet}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <FormField
          control={form.control}
          name="assets"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assets to Track</FormLabel>
              <FormDescription>
                Select cryptocurrencies to monitor in your portfolio
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
          name="protocols"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Protocols to Monitor</FormLabel>
              <FormDescription>
                Select DeFi protocols to track in your portfolio
              </FormDescription>
              
              <div className="flex flex-wrap gap-2 my-2">
                {protocols.map(protocol => (
                  <Badge key={protocol} variant="secondary" className="flex items-center gap-1">
                    {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeProtocol(protocol)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Select
                  onValueChange={setNewProtocol}
                  value={newProtocol}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularProtocols.map(protocol => (
                      <SelectItem key={protocol.value} value={protocol.value}>
                        {protocol.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addProtocol}
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
          name="monitoringInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monitoring Interval (minutes)</FormLabel>
              <FormDescription>
                How often to check for portfolio updates
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  min="5"
                  step="5"
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
