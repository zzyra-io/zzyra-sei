"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database, Play, AlertTriangle } from "lucide-react";
import { z } from "zod";

interface BlockConfigProps {
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

export default function SeiOnchainDataFetchConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
}: BlockConfigProps) {
  const [activeTab, setActiveTab] = useState("config");

  // Cast config to expected type with defaults
  const typedConfig = {
    network: "1328",
    dataType: "balance",
    targetAddress: "",
    cacheResults: true,
    cacheTtl: 60000,
    ...config,
  };

  const updateConfig = useCallback(
    (updates: Partial<typeof typedConfig>) => {
      const newConfig = { ...typedConfig, ...updates };
      onChange(newConfig);
    },
    [typedConfig, onChange]
  );

  const getStatusColor = () => {
    switch (executionStatus) {
      case "running":
        return "bg-blue-500";
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className='space-y-6'>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='config'>Configuration</TabsTrigger>
          <TabsTrigger value='inputs'>Inputs</TabsTrigger>
          <TabsTrigger value='outputs'>Outputs</TabsTrigger>
          <TabsTrigger value='execution'>Execution</TabsTrigger>
        </TabsList>

        <TabsContent value='config' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>
                Configure data fetching parameters
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='network'>Network</Label>
                  <Select
                    value={typedConfig.network}
                    onValueChange={(value) =>
                      updateConfig({ network: value as any })
                    }>
                    <SelectTrigger>
                      <SelectValue placeholder='Select network' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1328'>Sei Testnet</SelectItem>
                      <SelectItem value='sei-mainnet'>Sei Mainnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor='dataType'>Data Type</Label>
                  <Select
                    value={typedConfig.dataType}
                    onValueChange={(value) =>
                      updateConfig({ dataType: value as any })
                    }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='balance'>Balance</SelectItem>
                      <SelectItem value='token_balance'>
                        Token Balance
                      </SelectItem>
                      <SelectItem value='nfts'>NFTs</SelectItem>
                      <SelectItem value='defi_positions'>
                        DeFi Positions
                      </SelectItem>
                      <SelectItem value='tx_history'>
                        Transaction History
                      </SelectItem>
                      <SelectItem value='contract_state'>
                        Contract State
                      </SelectItem>
                      <SelectItem value='delegations'>Delegations</SelectItem>
                      <SelectItem value='rewards'>Rewards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor='targetAddress'>Target Address</Label>
                <Input
                  id='targetAddress'
                  placeholder='sei1...'
                  value={typedConfig.targetAddress}
                  onChange={(e) =>
                    updateConfig({ targetAddress: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Caching Settings</CardTitle>
              <CardDescription>Configure result caching</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='cacheResults'
                  checked={typedConfig.cacheResults}
                  onCheckedChange={(checked) =>
                    updateConfig({ cacheResults: !!checked })
                  }
                />
                <Label htmlFor='cacheResults'>Enable result caching</Label>
              </div>

              <div>
                <Label htmlFor='cacheTtl'>Cache TTL (ms)</Label>
                <Input
                  id='cacheTtl'
                  type='number'
                  min='1000'
                  value={typedConfig.cacheTtl}
                  onChange={(e) =>
                    updateConfig({
                      cacheTtl: parseInt(e.target.value) || 60000,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='inputs' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Input Schema</CardTitle>
              <CardDescription>
                Dynamic inputs from previous blocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "data": "any",
  "context": {...},
  "variables": {...},
  "dynamicAddress": "sei1...",
  "dynamicParams": {...}
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='outputs' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Output Schema</CardTitle>
              <CardDescription>Blockchain data response</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "success": true,
  "dataType": "balance",
  "address": "sei1...",
  "network": "1328",
  "data": {...},
  "metadata": {
    "blockHeight": 12345,
    "fetchTime": "2024-01-01T00:00:00Z",
    "cached": false
  },
  "timestamp": "2024-01-01T00:00:00Z"
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='execution' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Database className='h-4 w-4' />
                Execution Status
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <Badge variant='outline'>{executionStatus}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {executionData?.error && (
                <div className='flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded'>
                  <AlertTriangle className='h-5 w-5 text-red-500 mt-0.5' />
                  <div>
                    <h4 className='font-medium text-red-800'>Fetch Error</h4>
                    <p className='text-sm text-red-600 mt-1'>
                      {executionData.error}
                    </p>
                  </div>
                </div>
              )}

              {executionData?.lastResponse && (
                <div>
                  <h4 className='font-medium mb-2'>Last Data</h4>
                  <pre className='bg-gray-100 p-3 rounded text-sm max-h-40 overflow-auto'>
                    {JSON.stringify(executionData.lastResponse, null, 2)}
                  </pre>
                </div>
              )}

              {onTest && (
                <Button
                  onClick={onTest}
                  disabled={executionStatus === "running"}
                  className='w-full'>
                  <Play className='h-4 w-4 mr-2' />
                  Test Data Fetch
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
