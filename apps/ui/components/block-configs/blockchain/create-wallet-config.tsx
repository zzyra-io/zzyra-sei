"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { SUPPORTED_CHAINS } from "@zyra/types";
import { PlusCircle, Shield, Info, Database } from "lucide-react";

interface CreateWalletConfigProps {
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

export function CreateWalletConfig({ 
  config, 
  onChange, 
  executionStatus,
  executionData 
}: CreateWalletConfigProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  const selectedChain = SUPPORTED_CHAINS[config.chainId as string];
  const autoFund = config.autoFund as boolean || true;
  const saveToDb = config.saveToDb as boolean || true;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <PlusCircle className="h-5 w-5 text-emerald-500" />
        <h3 className="text-lg font-semibold">Create Wallet Configuration</h3>
      </div>

      {/* Chain Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Blockchain Network</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chainId">Chain</Label>
            <Select
              value={config.chainId as string || "sei-testnet"}
              onValueChange={(value) => handleChange("chainId", value)}
            >
              <SelectTrigger id="chainId">
                <SelectValue placeholder="Select blockchain network" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_CHAINS).map(([chainId, chain]) => (
                  <SelectItem key={chainId} value={chainId}>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{chain.symbol}</Badge>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Wallet Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="walletType">Wallet Type</Label>
            <Select
              value={config.walletType as string || "eoa"}
              onValueChange={(value) => handleChange("walletType", value)}
            >
              <SelectTrigger id="walletType">
                <SelectValue placeholder="Select wallet type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eoa">EOA (Externally Owned Account)</SelectItem>
                <SelectItem value="multisig">Multi-Signature Wallet</SelectItem>
                <SelectItem value="contract">Smart Contract Wallet</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              EOA is the standard wallet type for most use cases
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walletLabel">Wallet Label (Optional)</Label>
            <Input
              id="walletLabel"
              placeholder="e.g., Trading Wallet, DeFi Wallet"
              value={config.walletLabel as string || ""}
              onChange={(e) => handleChange("walletLabel", e.target.value)}
            />
            <div className="text-sm text-muted-foreground">
              Human-readable label for identification
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <span>Initial Funding</span>
            {selectedChain?.name.includes("Testnet") && (
              <Badge variant="secondary" className="text-xs">Testnet</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="autoFund"
              checked={autoFund}
              onCheckedChange={(checked) => handleChange("autoFund", checked)}
            />
            <Label htmlFor="autoFund">Auto-fund wallet on creation</Label>
          </div>
          
          {autoFund && (
            <div className="space-y-2 pl-6 border-l-2 border-muted">
              <Label htmlFor="fundingAmount">Funding Amount</Label>
              <div className="flex space-x-2">
                <Input
                  id="fundingAmount"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="1.0"
                  value={config.fundingAmount as string || "1.0"}
                  onChange={(e) => handleChange("fundingAmount", e.target.value)}
                />
                <div className="flex items-center px-3 py-2 bg-muted rounded-md text-sm">
                  {selectedChain?.symbol || "TOKEN"}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedChain?.name.includes("Testnet") 
                  ? "Testnet tokens will be provided automatically"
                  : "Mainnet funding requires existing wallet balance"
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Storage Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="saveToDb"
              checked={saveToDb}
              onCheckedChange={(checked) => handleChange("saveToDb", checked)}
            />
            <Label htmlFor="saveToDb">Save wallet to database</Label>
          </div>
          <div className="text-sm text-muted-foreground">
            Store wallet address and metadata for future use. 
            Private keys are never stored.
          </div>
        </CardContent>
      </Card>

      {/* Security Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> Private keys are generated securely and never stored. 
          Make sure to backup the generated wallet address and private key immediately after creation.
        </AlertDescription>
      </Alert>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This block creates a new blockchain wallet with a unique address and private key.
          Use for automated workflows that need dedicated wallet addresses.
        </AlertDescription>
      </Alert>

      {/* Execution Status */}
      {executionStatus && executionStatus !== "idle" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Execution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={
                  executionStatus === "success" ? "default" :
                  executionStatus === "error" ? "destructive" :
                  executionStatus === "warning" ? "secondary" : "outline"
                }
              >
                {executionStatus}
              </Badge>
              {executionData?.duration && (
                <span className="text-sm text-muted-foreground">
                  {executionData.duration}ms
                </span>
              )}
            </div>
            {executionData?.error && (
              <div className="mt-2 text-sm text-red-500">
                {executionData.error}
              </div>
            )}
            {executionData?.lastResponse && (() => {
              const response = executionData.lastResponse as Record<string, unknown>;
              return (
                <div className="mt-2 space-y-1">
                  {response?.walletAddress && (
                    <div className="text-sm text-green-600">
                      Wallet Address: {String(response.walletAddress)}
                    </div>
                  )}
                  {response?.fundingTxHash && (
                    <div className="text-sm text-blue-600">
                      Funding TX: {String(response.fundingTxHash)}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}