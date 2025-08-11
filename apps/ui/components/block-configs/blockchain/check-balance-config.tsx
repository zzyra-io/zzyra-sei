"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Button } from "@/components/ui/button";
import { SUPPORTED_CHAINS } from "@zzyra/types";
import { Wallet, Info, Plus, X } from "lucide-react";

interface CheckBalanceConfigProps {
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

export function CheckBalanceConfig({
  config,
  onChange,
  executionStatus,
  executionData,
}: CheckBalanceConfigProps) {
  const [isValid, setIsValid] = useState(true);

  // Validate configuration
  const validateCurrentConfig = useCallback(() => {
    const walletAddress = config.walletAddress as string;

    return Boolean(
      walletAddress && walletAddress.trim() && walletAddress.length >= 20
    );
  }, [config.walletAddress]);

  // Update validation state
  useEffect(() => {
    const configIsValid = validateCurrentConfig();
    setIsValid(configIsValid);
  }, [validateCurrentConfig]);

  // Create a version of onChange that includes validation state
  const handleChangeWithValidation = useCallback(
    (key: string, value: unknown) => {
      const newConfig = { ...config, [key]: value };

      // Calculate validation for the new config
      const walletAddress = (
        key === "walletAddress" ? value : config.walletAddress
      ) as string;

      const configIsValid = Boolean(
        walletAddress && walletAddress.trim() && walletAddress.length >= 20
      );

      onChange({ ...newConfig, isValid: configIsValid });
    },
    [config, onChange]
  );

  const selectedChain =
    SUPPORTED_CHAINS[config.chainId as keyof typeof SUPPORTED_CHAINS];

  // Token addresses are handled directly in the textarea

  return (
    <div className='p-4 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <Wallet className='h-5 w-5 text-green-500' />
          <h3 className='text-lg font-semibold'>Check Balance Configuration</h3>
        </div>
        {!isValid && (
          <Badge variant='destructive' className='text-xs'>
            Configuration Required
          </Badge>
        )}
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
              onValueChange={(value) =>
                handleChangeWithValidation("chainId", value)
              }>
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

      {/* Wallet Configuration */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Wallet Address</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='walletAddress'>Wallet Address *</Label>
            <Input
              id='walletAddress'
              placeholder={
                selectedChain?.name === "SEI Testnet" ? "sei1..." : "0x..."
              }
              value={(config.walletAddress as string) || ""}
              onChange={(e) =>
                handleChangeWithValidation("walletAddress", e.target.value)
              }
            />
            <div className='text-sm text-muted-foreground'>
              Address to check balance for
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Addresses */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Token Addresses (Optional)</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='tokenAddresses'>Token Contract Addresses</Label>
            <Textarea
              id='tokenAddresses'
              placeholder='Enter token contract addresses (one per line)&#10;Leave empty to check only native token balance'
              value={(config.tokenAddresses as string) || ""}
              onChange={(e) =>
                handleChangeWithValidation("tokenAddresses", e.target.value)
              }
              rows={4}
            />
            <div className='text-sm text-muted-foreground'>
              One token contract address per line. Leave empty to check only
              native {selectedChain?.symbol || "token"} balance.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Options</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center space-x-2'>
            <Switch
              id='includeUsdValue'
              checked={(config.includeUsdValue as boolean) || false}
              onCheckedChange={(checked) =>
                handleChangeWithValidation("includeUsdValue", checked)
              }
            />
            <Label htmlFor='includeUsdValue'>Include USD Value</Label>
          </div>
          <div className='text-sm text-muted-foreground'>
            Fetch current USD prices for tokens (requires external price API)
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className='h-4 w-4' />
        <AlertDescription>
          This block will return balance information for the specified wallet
          address. Native token balance is always included.
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
            {executionData?.lastResponse && (
              <div className='mt-2 text-xs font-mono bg-muted p-2 rounded'>
                {JSON.stringify(executionData.lastResponse, null, 2)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
