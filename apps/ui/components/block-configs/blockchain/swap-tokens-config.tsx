"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { SUPPORTED_CHAINS } from "@zzyra/types";
import { RefreshCw, AlertTriangle, Info, ArrowDown } from "lucide-react";

interface SwapTokensConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
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

export function SwapTokensConfig({
  config,
  onChange,
  executionStatus,
  executionData,
}: SwapTokensConfigProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  const selectedChain = SUPPORTED_CHAINS[config.chainId as string];
  const slippageTolerance = (config.slippageTolerance as number) || 1.0;

  return (
    <div className='p-4 space-y-6'>
      {/* Header */}
      <div className='flex items-center space-x-2'>
        <RefreshCw className='h-5 w-5 text-purple-500' />
        <h3 className='text-lg font-semibold'>Swap Tokens Configuration</h3>
      </div>

      {/* Chain Selection */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Blockchain Network</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='chainId'>Chain</Label>
            <Select
              value={(config.chainId as string) || "1328"}
              onValueChange={(value) => handleChange("chainId", value)}>
              <SelectTrigger id='chainId'>
                <SelectValue placeholder='Select blockchain network' />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_CHAINS).map(([chainId, chain]) => (
                  <SelectItem key={chainId} value={chainId}>
                    <div className='flex items-center space-x-2'>
                      <Badge variant='outline'>{chain.symbol}</Badge>
                      <span>{chain.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Token Swap Configuration */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Token Swap Details</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* From Token */}
          <div className='space-y-2'>
            <Label htmlFor='fromToken'>From Token *</Label>
            <Input
              id='fromToken'
              placeholder={`Native ${selectedChain?.symbol || "token"} or contract address`}
              value={(config.fromToken as string) || ""}
              onChange={(e) => handleChange("fromToken", e.target.value)}
            />
            <div className='text-sm text-muted-foreground'>
              Leave empty or use "native" for{" "}
              {selectedChain?.symbol || "native token"}
            </div>
          </div>

          {/* Swap Direction Indicator */}
          <div className='flex justify-center'>
            <ArrowDown className='h-5 w-5 text-muted-foreground' />
          </div>

          {/* To Token */}
          <div className='space-y-2'>
            <Label htmlFor='toToken'>To Token *</Label>
            <Input
              id='toToken'
              placeholder='Token contract address'
              value={(config.toToken as string) || ""}
              onChange={(e) => handleChange("toToken", e.target.value)}
            />
            <div className='text-sm text-muted-foreground'>
              Contract address of the token you want to receive
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amount Configuration */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Swap Amounts</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='amountIn'>Amount In *</Label>
            <Input
              id='amountIn'
              type='number'
              step='0.000001'
              min='0'
              placeholder='0.0'
              value={(config.amountIn as string) || ""}
              onChange={(e) => handleChange("amountIn", e.target.value)}
            />
            <div className='text-sm text-muted-foreground'>
              Amount of tokens to swap
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='minAmountOut'>Minimum Amount Out *</Label>
            <Input
              id='minAmountOut'
              type='number'
              step='0.000001'
              min='0'
              placeholder='0.0'
              value={(config.minAmountOut as string) || ""}
              onChange={(e) => handleChange("minAmountOut", e.target.value)}
            />
            <div className='text-sm text-muted-foreground'>
              Minimum amount of tokens to receive (protects against slippage)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slippage and Advanced Settings */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-3'>
            <Label>Slippage Tolerance: {slippageTolerance}%</Label>
            <Slider
              value={[slippageTolerance]}
              onValueChange={([value]) =>
                handleChange("slippageTolerance", value)
              }
              min={0.1}
              max={10}
              step={0.1}
              className='w-full'
            />
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>0.1%</span>
              <span>10%</span>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='dexPlatform'>DEX Platform</Label>
            <Select
              value={(config.dexPlatform as string) || "auto"}
              onValueChange={(value) => handleChange("dexPlatform", value)}>
              <SelectTrigger id='dexPlatform'>
                <SelectValue placeholder='Select DEX platform' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='auto'>Auto (Best Route)</SelectItem>
                <SelectItem value='uniswap'>Uniswap</SelectItem>
                <SelectItem value='sushiswap'>SushiSwap</SelectItem>
                <SelectItem value='pancakeswap'>PancakeSwap</SelectItem>
                <SelectItem value='dragonswap'>DragonSwap (SEI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='deadline'>Deadline (minutes)</Label>
            <Input
              id='deadline'
              type='number'
              min='1'
              max='120'
              placeholder='20'
              value={(config.deadline as string) || "20"}
              onChange={(e) =>
                handleChange("deadline", parseInt(e.target.value) || 20)
              }
            />
            <div className='text-sm text-muted-foreground'>
              Transaction deadline in minutes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert>
        <AlertTriangle className='h-4 w-4' />
        <AlertDescription>
          Token swaps involve financial risk. Always verify token addresses and
          amounts. This operation requires blockchain authorization with
          appropriate spending limits.
        </AlertDescription>
      </Alert>

      {/* Info Alert */}
      <Alert>
        <Info className='h-4 w-4' />
        <AlertDescription>
          Swapping will be executed on the selected DEX platform. Slippage
          protection ensures you don't receive less than the minimum amount
          specified.
        </AlertDescription>
      </Alert>

      {/* Execution Status */}
      {executionStatus && executionStatus !== "idle" && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Execution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center space-x-2'>
              <Badge
                variant={
                  executionStatus === "success"
                    ? "default"
                    : executionStatus === "error"
                      ? "destructive"
                      : executionStatus === "warning"
                        ? "secondary"
                        : "outline"
                }>
                {executionStatus}
              </Badge>
              {executionData?.duration && (
                <span className='text-sm text-muted-foreground'>
                  {executionData.duration}ms
                </span>
              )}
            </div>
            {executionData?.error && (
              <div className='mt-2 text-sm text-red-500'>
                {executionData.error}
              </div>
            )}
            {executionData?.lastResponse &&
              (() => {
                const response = executionData.lastResponse as Record<
                  string,
                  unknown
                >;
                const txHash = response?.transactionHash;
                return txHash ? (
                  <div className='mt-2 text-sm text-green-600'>
                    Swap Hash: {String(txHash)}
                  </div>
                ) : null;
              })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
