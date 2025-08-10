"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { SUPPORTED_CHAINS } from "@zzyra/types";
import { Send, AlertCircle, Info } from "lucide-react";

interface SendTransactionConfigProps {
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

export function SendTransactionConfig({
  config,
  onChange,
  executionStatus,
  executionData,
}: SendTransactionConfigProps) {
  // Define isValidAddress function first
  const isValidAddress = (address: string) => {
    if (!address) return false;
    // Basic validation - could be enhanced with chain-specific validation
    return (
      address.length >= 20 &&
      (address.startsWith("0x") || address.startsWith("sei"))
    );
  };

  const prevIsValidRef = useRef<boolean | undefined>(undefined);

  const [isValid, setIsValid] = useState(() => {
    // Initialize with actual validation state
    const recipientAddress = config.recipientAddress as string;
    const amount = config.amount as string;

    return Boolean(
      recipientAddress &&
        recipientAddress.trim() &&
        isValidAddress(recipientAddress) &&
        amount &&
        parseFloat(amount) > 0
    );
  });

  // Validate configuration without calling onChange in useEffect to avoid loops
  const validateCurrentConfig = useCallback(() => {
    const recipientAddress = config.recipientAddress as string;
    const amount = config.amount as string;

    return Boolean(
      recipientAddress &&
        recipientAddress.trim() &&
        isValidAddress(recipientAddress) &&
        amount &&
        parseFloat(amount) > 0
    );
  }, [config.recipientAddress, config.amount]);

  // Update validation state and notify parent
  useEffect(() => {
    const configIsValid = validateCurrentConfig();
    setIsValid(configIsValid);

    // Only notify parent if validation state changed
    if (prevIsValidRef.current !== configIsValid) {
      prevIsValidRef.current = configIsValid;
      onChange({ ...config, isValid: configIsValid });
    }
  }, [validateCurrentConfig, config.recipientAddress, config.amount]);

  // Create a version of onChange that includes validation state
  const handleChangeWithValidation = useCallback(
    (key: string, value: unknown) => {
      const newConfig = { ...config, [key]: value };

      // Calculate validation for the new config
      const recipientAddress = (
        key === "recipientAddress" ? value : config.recipientAddress
      ) as string;
      const amount = (key === "amount" ? value : config.amount) as string;

      const configIsValid = Boolean(
        recipientAddress &&
          recipientAddress.trim() &&
          isValidAddress(recipientAddress) &&
          amount &&
          parseFloat(amount) > 0
      );

      onChange({ ...newConfig, isValid: configIsValid });
    },
    [config, onChange]
  );

  const selectedChain = config.chainId
    ? SUPPORTED_CHAINS[config.chainId as keyof typeof SUPPORTED_CHAINS]
    : undefined;

  return (
    <div className='p-4 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <Send className='h-5 w-5 text-blue-500' />
          <h3 className='text-lg font-semibold'>
            Send Transaction Configuration
          </h3>
        </div>
        {!isValid && (
          <div className='flex items-center space-x-2'>
            <Badge variant='destructive' className='text-xs'>
              Configuration Required
            </Badge>
            <div className='text-xs text-muted-foreground'>
              {(() => {
                const issues = [];
                if (!config.recipientAddress)
                  issues.push("• Add recipient address");
                if (!config.amount) issues.push("• Add amount");
                if (
                  config.recipientAddress &&
                  !isValidAddress(config.recipientAddress as string)
                ) {
                  issues.push("• Fix address format");
                }
                if (config.amount && parseFloat(String(config.amount)) <= 0) {
                  issues.push("• Amount must be > 0");
                }
                return issues.join(" ");
              })()}
            </div>
          </div>
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
            {selectedChain && (
              <div className='text-sm text-muted-foreground'>
                Native token: {selectedChain.symbol}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='recipientAddress'>Recipient Address *</Label>
            <Input
              id='recipientAddress'
              placeholder={
                selectedChain?.name === "SEI Testnet" ? "sei1..." : "0x..."
              }
              value={(config.recipientAddress as string) || ""}
              onChange={(e) =>
                handleChangeWithValidation("recipientAddress", e.target.value)
              }
              className={
                config.recipientAddress &&
                typeof config.recipientAddress === "string" &&
                !isValidAddress(config.recipientAddress)
                  ? "border-red-500"
                  : ""
              }
            />
            {typeof config.recipientAddress === "string" &&
              config.recipientAddress &&
              !isValidAddress(config.recipientAddress) && (
                <div className='flex items-center space-x-1 text-sm text-red-500'>
                  <AlertCircle className='h-4 w-4' />
                  <span>Invalid address format</span>
                </div>
              )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='amount'>Amount *</Label>
            <div className='flex space-x-2'>
              <Input
                id='amount'
                type='number'
                step='0.000001'
                min='0'
                placeholder='0.0'
                value={(config.amount as string) || ""}
                onChange={(e) =>
                  handleChangeWithValidation("amount", e.target.value)
                }
              />
              <div className='flex items-center px-3 py-2 bg-muted rounded-md text-sm'>
                {selectedChain?.symbol || "TOKEN"}
              </div>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='tokenAddress'>Token Address (Optional)</Label>
            <Input
              id='tokenAddress'
              placeholder='Leave empty for native token'
              value={(config.tokenAddress as string) || ""}
              onChange={(e) =>
                handleChangeWithValidation("tokenAddress", e.target.value)
              }
            />
            <div className='text-sm text-muted-foreground'>
              Leave empty to send native {selectedChain?.symbol || "tokens"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gas Settings */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>Gas Settings</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='gasLimit'>Gas Limit</Label>
            <Input
              id='gasLimit'
              type='number'
              min='21000'
              placeholder='21000'
              value={(config.gasLimit as string) || "21000"}
              onChange={(e) =>
                handleChangeWithValidation(
                  "gasLimit",
                  parseInt(e.target.value) || 21000
                )
              }
            />
            <div className='text-sm text-muted-foreground'>
              Standard transfer: 21,000 gas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className='h-4 w-4' />
        <AlertDescription>
          This block requires blockchain authorization during workflow
          execution. You&apos;ll be prompted to approve spending limits and
          operations.
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
                    Transaction: {String(txHash)}
                  </div>
                ) : null;
              })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
