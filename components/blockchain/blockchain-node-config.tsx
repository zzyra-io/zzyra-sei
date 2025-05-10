"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { BlockchainNodeType, getBlockchainNodeMetadata } from "@/lib/web3/blockchain-nodes";

// Chain options for dropdowns
const chainOptions = [
  { value: "1", label: "Ethereum" },
  { value: "10", label: "Optimism" },
  { value: "56", label: "BSC" },
  { value: "137", label: "Polygon" },
  { value: "42161", label: "Arbitrum" },
  { value: "8453", label: "Base" },
];

// Token options for dropdowns
const tokenOptions = [
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "WETH", label: "Wrapped Ethereum (WETH)" },
  { value: "USDC", label: "USD Coin (USDC)" },
  { value: "USDT", label: "Tether (USDT)" },
  { value: "DAI", label: "Dai (DAI)" },
  { value: "WBTC", label: "Wrapped Bitcoin (WBTC)" },
  { value: "MATIC", label: "Polygon (MATIC)" },
  { value: "BNB", label: "Binance Coin (BNB)" },
  { value: "CUSTOM", label: "Custom Token Address" },
];

// Base schema for all blockchain node types
const baseSchema = z.object({
  chainId: z.string().min(1, "Chain is required"),
  nodeType: z.string(),
});

// Transaction monitor schema
const transactionMonitorSchema = baseSchema.extend({
  address: z.string().min(1, "Address is required"),
  interval: z.number().min(5).max(300),
  confirmations: z.number().min(1).max(12),
});

// Transaction verify schema
const transactionVerifySchema = baseSchema.extend({
  txHash: z.string().min(1, "Transaction hash is required"),
  confirmations: z.number().min(1).max(12),
  expectedTo: z.string().optional(),
  expectedValue: z.string().optional(),
});

// Token transfer schema
const tokenTransferSchema = baseSchema.extend({
  tokenType: z.string().min(1, "Token type is required"),
  tokenAddress: z.string().optional(),
  recipient: z.string().min(1, "Recipient address is required"),
  amount: z.string().min(1, "Amount is required"),
});

// Token balance schema
const tokenBalanceSchema = baseSchema.extend({
  tokenType: z.string().min(1, "Token type is required"),
  tokenAddress: z.string().optional(),
  address: z.string().min(1, "Address is required"),
});

// Gas optimizer schema
const gasOptimizerSchema = baseSchema.extend({
  strategy: z.enum(["slow", "standard", "fast", "rapid"]),
  maxGasPrice: z.string().min(1, "Max gas price is required"),
});

// DeFi swap schema
const defiSwapSchema = baseSchema.extend({
  fromToken: z.string().min(1, "From token is required"),
  fromTokenAddress: z.string().optional(),
  toToken: z.string().min(1, "To token is required"),
  toTokenAddress: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  slippage: z.number().min(0.1).max(50),
});

// Get schema based on node type
const getSchemaForNodeType = (nodeType: BlockchainNodeType) => {
  switch (nodeType) {
    case BlockchainNodeType.TRANSACTION_MONITOR:
      return transactionMonitorSchema;
    case BlockchainNodeType.TRANSACTION_VERIFY:
      return transactionVerifySchema;
    case BlockchainNodeType.TOKEN_TRANSFER:
      return tokenTransferSchema;
    case BlockchainNodeType.TOKEN_BALANCE:
      return tokenBalanceSchema;
    case BlockchainNodeType.GAS_OPTIMIZER:
      return gasOptimizerSchema;
    case BlockchainNodeType.DEFI_SWAP:
      return defiSwapSchema;
    default:
      return baseSchema;
  }
};

interface BlockchainNodeConfigProps {
  nodeType: BlockchainNodeType;
  initialConfig?: any;
  onConfigChange: (config: any) => void;
}

export const BlockchainNodeConfig = ({ 
  nodeType, 
  initialConfig = {}, 
  onConfigChange 
}: BlockchainNodeConfigProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const metadata = getBlockchainNodeMetadata(nodeType);
  
  // Create form with dynamic schema based on node type
  const form = useForm({
    resolver: zodResolver(getSchemaForNodeType(nodeType)),
    defaultValues: {
      nodeType,
      chainId: initialConfig.chainId || "1",
      ...getDefaultValuesForNodeType(nodeType, initialConfig),
    },
  });

  // Watch for form changes to update parent component
  const formValues = form.watch();
  
  useEffect(() => {
    onConfigChange(formValues);
  }, [formValues, onConfigChange]);

  // Handle form submission
  const onSubmit = (data: any) => {
    onConfigChange(data);
  };

  // Render form fields based on node type
  const renderFormFields = () => {
    switch (nodeType) {
      case BlockchainNodeType.TRANSACTION_MONITOR:
        return renderTransactionMonitorFields();
      case BlockchainNodeType.TRANSACTION_VERIFY:
        return renderTransactionVerifyFields();
      case BlockchainNodeType.TOKEN_TRANSFER:
        return renderTokenTransferFields();
      case BlockchainNodeType.TOKEN_BALANCE:
        return renderTokenBalanceFields();
      case BlockchainNodeType.GAS_OPTIMIZER:
        return renderGasOptimizerFields();
      case BlockchainNodeType.DEFI_SWAP:
        return renderDefiSwapFields();
      default:
        return renderBasicFields();
    }
  };

  // Basic fields common to all node types
  const renderBasicFields = () => (
    <>
      <FormField
        control={form.control}
        name="chainId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Blockchain Network</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select blockchain" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {chainOptions.map(chain => (
                  <SelectItem key={chain.value} value={chain.value}>
                    {chain.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Select the blockchain network to use
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  // Transaction monitor specific fields
  const renderTransactionMonitorFields = () => (
    <>
      {renderBasicFields()}
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Wallet Address</FormLabel>
            <FormControl>
              <Input placeholder="0x..." {...field} />
            </FormControl>
            <FormDescription>
              The address to monitor for transactions
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="interval"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Monitoring Interval (seconds)</FormLabel>
            <FormControl>
              <Slider
                min={5}
                max={300}
                step={5}
                defaultValue={[field.value]}
                onValueChange={(vals) => field.onChange(vals[0])}
              />
            </FormControl>
            <FormDescription>
              How often to check for new transactions ({field.value} seconds)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="confirmations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Required Confirmations</FormLabel>
            <FormControl>
              <Slider
                min={1}
                max={12}
                step={1}
                defaultValue={[field.value]}
                onValueChange={(vals) => field.onChange(vals[0])}
              />
            </FormControl>
            <FormDescription>
              Number of confirmations required ({field.value})
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  // Transaction verify specific fields
  const renderTransactionVerifyFields = () => (
    <>
      {renderBasicFields()}
      <FormField
        control={form.control}
        name="txHash"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Transaction Hash</FormLabel>
            <FormControl>
              <Input placeholder="0x..." {...field} />
            </FormControl>
            <FormDescription>
              The transaction hash to verify
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="confirmations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Required Confirmations</FormLabel>
            <FormControl>
              <Slider
                min={1}
                max={12}
                step={1}
                defaultValue={[field.value]}
                onValueChange={(vals) => field.onChange(vals[0])}
              />
            </FormControl>
            <FormDescription>
              Number of confirmations required ({field.value})
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="expectedTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expected Recipient (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="0x..." {...field} />
            </FormControl>
            <FormDescription>
              Verify the transaction recipient matches this address
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="expectedValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expected Value (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="0.1" {...field} />
            </FormControl>
            <FormDescription>
              Verify the transaction value matches this amount in ETH
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  // Token transfer specific fields
  const renderTokenTransferFields = () => (
    <>
      {renderBasicFields()}
      <FormField
        control={form.control}
        name="tokenType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {tokenOptions.map(token => (
                  <SelectItem key={token.value} value={token.value}>
                    {token.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Select the token to transfer
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {form.watch("tokenType") === "CUSTOM" && (
        <FormField
          control={form.control}
          name="tokenAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Contract Address</FormLabel>
              <FormControl>
                <Input placeholder="0x..." {...field} />
              </FormControl>
              <FormDescription>
                The contract address of the custom token
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      
      <FormField
        control={form.control}
        name="recipient"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recipient Address</FormLabel>
            <FormControl>
              <Input placeholder="0x..." {...field} />
            </FormControl>
            <FormDescription>
              The address to receive the tokens
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <Input placeholder="0.1" {...field} />
            </FormControl>
            <FormDescription>
              The amount of tokens to transfer
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  // Token balance specific fields
  const renderTokenBalanceFields = () => (
    <>
      {renderBasicFields()}
      <FormField
        control={form.control}
        name="tokenType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {tokenOptions.map(token => (
                  <SelectItem key={token.value} value={token.value}>
                    {token.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Select the token to check balance
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {form.watch("tokenType") === "CUSTOM" && (
        <FormField
          control={form.control}
          name="tokenAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Contract Address</FormLabel>
              <FormControl>
                <Input placeholder="0x..." {...field} />
              </FormControl>
              <FormDescription>
                The contract address of the custom token
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Wallet Address</FormLabel>
            <FormControl>
              <Input placeholder="0x..." {...field} />
            </FormControl>
            <FormDescription>
              The address to check balance for
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  // Gas optimizer specific fields
  const renderGasOptimizerFields = () => (
    <>
      {renderBasicFields()}
      <FormField
        control={form.control}
        name="strategy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gas Strategy</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="slow">Slow (Cheapest)</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="rapid">Rapid (Most Expensive)</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Select gas price strategy
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="maxGasPrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Max Gas Price (gwei)</FormLabel>
            <FormControl>
              <Input placeholder="100" {...field} />
            </FormControl>
            <FormDescription>
              Maximum gas price to pay in gwei
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  // DeFi swap specific fields
  const renderDefiSwapFields = () => (
    <>
      {renderBasicFields()}
      <FormField
        control={form.control}
        name="fromToken"
        render={({ field }) => (
          <FormItem>
            <FormLabel>From Token</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {tokenOptions.map(token => (
                  <SelectItem key={token.value} value={token.value}>
                    {token.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Token to swap from
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {form.watch("fromToken") === "CUSTOM" && (
        <FormField
          control={form.control}
          name="fromTokenAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Token Address</FormLabel>
              <FormControl>
                <Input placeholder="0x..." {...field} />
              </FormControl>
              <FormDescription>
                The contract address of the custom token
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      
      <FormField
        control={form.control}
        name="toToken"
        render={({ field }) => (
          <FormItem>
            <FormLabel>To Token</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {tokenOptions.map(token => (
                  <SelectItem key={token.value} value={token.value}>
                    {token.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Token to swap to
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {form.watch("toToken") === "CUSTOM" && (
        <FormField
          control={form.control}
          name="toTokenAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Token Address</FormLabel>
              <FormControl>
                <Input placeholder="0x..." {...field} />
              </FormControl>
              <FormDescription>
                The contract address of the custom token
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <Input placeholder="0.1" {...field} />
            </FormControl>
            <FormDescription>
              The amount to swap
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="slippage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slippage Tolerance (%)</FormLabel>
            <FormControl>
              <Slider
                min={0.1}
                max={5}
                step={0.1}
                defaultValue={[field.value]}
                onValueChange={(vals) => field.onChange(vals[0])}
              />
            </FormControl>
            <FormDescription>
              Maximum price slippage allowed ({field.value}%)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{metadata.label} Configuration</CardTitle>
        <CardDescription>{metadata.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {renderFormFields()}
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="advanced">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nodeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Node Type</FormLabel>
                    <FormControl>
                      <Input value={field.value} disabled />
                    </FormControl>
                    <FormDescription>
                      The type of blockchain node
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              {/* Additional advanced settings could be added here */}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper function to get default values based on node type
function getDefaultValuesForNodeType(nodeType: BlockchainNodeType, initialConfig: any) {
  const metadata = getBlockchainNodeMetadata(nodeType);
  const defaultConfig = metadata.defaultConfig || {};
  
  // Merge default config with initial config
  const mergedConfig = { ...defaultConfig, ...initialConfig };
  
  switch (nodeType) {
    case BlockchainNodeType.TRANSACTION_MONITOR:
      return {
        address: mergedConfig.address || "",
        interval: mergedConfig.interval || 15,
        confirmations: mergedConfig.confirmations || 1,
      };
    
    case BlockchainNodeType.TRANSACTION_VERIFY:
      return {
        txHash: mergedConfig.txHash || "",
        confirmations: mergedConfig.confirmations || 1,
        expectedTo: mergedConfig.expectedTo || "",
        expectedValue: mergedConfig.expectedValue || "",
      };
    
    case BlockchainNodeType.TOKEN_TRANSFER:
      return {
        tokenType: mergedConfig.tokenType || "ETH",
        tokenAddress: mergedConfig.tokenAddress || "",
        recipient: mergedConfig.recipient || "",
        amount: mergedConfig.amount || "0.1",
      };
    
    case BlockchainNodeType.TOKEN_BALANCE:
      return {
        tokenType: mergedConfig.tokenType || "ETH",
        tokenAddress: mergedConfig.tokenAddress || "",
        address: mergedConfig.address || "",
      };
    
    case BlockchainNodeType.GAS_OPTIMIZER:
      return {
        strategy: mergedConfig.strategy || "standard",
        maxGasPrice: mergedConfig.maxGasPrice || "100",
      };
    
    case BlockchainNodeType.DEFI_SWAP:
      return {
        fromToken: mergedConfig.fromToken || "ETH",
        fromTokenAddress: mergedConfig.fromTokenAddress || "",
        toToken: mergedConfig.toToken || "USDC",
        toTokenAddress: mergedConfig.toTokenAddress || "",
        amount: mergedConfig.amount || "0.1",
        slippage: mergedConfig.slippage || 0.5,
      };
    
    default:
      return {};
  }
}

export default BlockchainNodeConfig;
