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
import { Trash2, Plus, Play, AlertTriangle } from "lucide-react";
import { z } from "zod";
import {
  seiWalletListenerSchema,
  type SeiWalletListenerConfig,
} from "@zyra/types";

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

export default function SeiWalletListenerConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
}: BlockConfigProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Cast config to expected type with defaults
  const typedConfig = {
    network: "1328",
    walletAddresses: [] as string[],
    eventTypes: [] as string[],
    pollingInterval: 30000,
    maxEventsPerPoll: 50,
    includeRawEvents: false,
    filters: {} as Record<string, unknown>,
    ...config,
  };

  const validateConfig = useCallback(
    (configToValidate: Record<string, unknown>) => {
      try {
        seiWalletListenerSchema.configSchema.parse(configToValidate);
        setValidationErrors({});
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          // Access the issues property instead of errors
          error.issues.forEach((err: z.ZodIssue) => {
            if (err.path.length > 0) {
              errors[err.path.join(".")] = err.message;
            }
          });
          setValidationErrors(errors);
        }
        return false;
      }
    },
    []
  );

  const updateConfig = useCallback(
    (updates: Record<string, unknown>) => {
      const newConfig = { ...typedConfig, ...updates };
      validateConfig(newConfig);
      onChange(newConfig);
    },
    [typedConfig, validateConfig, onChange]
  );

  const addWalletAddress = () => {
    const currentAddresses = typedConfig.walletAddresses || [];
    const newAddresses = [...currentAddresses, ""];
    updateConfig({ walletAddresses: newAddresses });
  };

  const removeWalletAddress = (index: number) => {
    const currentAddresses = typedConfig.walletAddresses || [];
    const newAddresses = currentAddresses.filter(
      (_: string, i: number) => i !== index
    );
    updateConfig({ walletAddresses: newAddresses });
  };

  const updateWalletAddress = (index: number, value: string) => {
    const currentAddresses = typedConfig.walletAddresses || [];
    const newAddresses = [...currentAddresses];
    newAddresses[index] = value;
    updateConfig({ walletAddresses: newAddresses });
  };

  const toggleEventType = (eventType: string) => {
    const currentEventTypes = typedConfig.eventTypes || [];
    const newEventTypes = currentEventTypes.includes(eventType)
      ? currentEventTypes.filter((type: string) => type !== eventType)
      : [...currentEventTypes, eventType];
    updateConfig({ eventTypes: newEventTypes });
  };

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
          {/* Network Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
              <CardDescription>
                Select the Sei network to monitor
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='network'>Network</Label>
                <Select
                  value={typedConfig.network}
                  onValueChange={(value) => updateConfig({ network: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select network' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1328'>Sei Testnet</SelectItem>
                    <SelectItem value='sei-mainnet'>Sei Mainnet</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.network && (
                  <p className='text-sm text-red-500 mt-1'>
                    {validationErrors.network}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Wallet Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Addresses</CardTitle>
              <CardDescription>
                Add Sei wallet addresses to monitor (max 10)
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {(typedConfig.walletAddresses || []).map((address, index) => (
                <div key={index} className='flex gap-2'>
                  <Input
                    placeholder='sei1... or 0x...'
                    value={address}
                    onChange={(e) => updateWalletAddress(index, e.target.value)}
                    className='flex-1'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => removeWalletAddress(index)}>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
              {(typedConfig.walletAddresses || []).length < 10 && (
                <Button variant='outline' onClick={addWalletAddress}>
                  <Plus className='h-4 w-4 mr-2' />
                  Add Address
                </Button>
              )}
              {validationErrors.walletAddresses && (
                <p className='text-sm text-red-500'>
                  {validationErrors.walletAddresses}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Event Types */}
          <Card>
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>
                Select which blockchain events to monitor
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                {[
                  { value: "transfer", label: "Transfers" },
                  { value: "swap", label: "Swaps" },
                  { value: "contract_call", label: "Contract Calls" },
                  { value: "nft_transfer", label: "NFT Transfers" },
                  { value: "nft_mint", label: "NFT Mints" },
                  { value: "governance_vote", label: "Governance Votes" },
                ].map(({ value, label }) => (
                  <div key={value} className='flex items-center space-x-2'>
                    <Checkbox
                      id={value}
                      checked={typedConfig.eventTypes.includes(value as string)}
                      onCheckedChange={() => toggleEventType(value)}
                    />
                    <Label htmlFor={value}>{label}</Label>
                  </div>
                ))}
              </div>
              {validationErrors.eventTypes && (
                <p className='text-sm text-red-500'>
                  {validationErrors.eventTypes}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Fine-tune monitoring behavior</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='pollingInterval'>Polling Interval (ms)</Label>
                  <Input
                    id='pollingInterval'
                    type='number'
                    min='5000'
                    max='300000'
                    value={typedConfig.pollingInterval}
                    onChange={(e) =>
                      updateConfig({
                        pollingInterval: parseInt(e.target.value) || 30000,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='maxEventsPerPoll'>Max Events Per Poll</Label>
                  <Input
                    id='maxEventsPerPoll'
                    type='number'
                    min='1'
                    max='100'
                    value={typedConfig.maxEventsPerPoll}
                    onChange={(e) =>
                      updateConfig({
                        maxEventsPerPoll: parseInt(e.target.value) || 50,
                      })
                    }
                  />
                </div>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='includeRawEvents'
                  checked={typedConfig.includeRawEvents}
                  onCheckedChange={(checked) =>
                    updateConfig({ includeRawEvents: !!checked })
                  }
                />
                <Label htmlFor='includeRawEvents'>Include Raw Event Data</Label>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters (Optional)</CardTitle>
              <CardDescription>
                Add filters to narrow down events
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='minAmount'>Minimum Amount</Label>
                  <Input
                    id='minAmount'
                    type='number'
                    placeholder='0'
                    value={String(typedConfig.filters?.minAmount || "")}
                    onChange={(e) =>
                      updateConfig({
                        filters: {
                          ...typedConfig.filters,
                          minAmount: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='tokenDenom'>Token Denomination</Label>
                  <Input
                    id='tokenDenom'
                    placeholder='usei'
                    value={String(typedConfig.filters?.tokenDenom || "")}
                    onChange={(e) =>
                      updateConfig({
                        filters: {
                          ...typedConfig.filters,
                          tokenDenom: e.target.value || undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='inputs' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Input Schema</CardTitle>
              <CardDescription>
                This block accepts standard workflow inputs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "data": "any", // Optional data from previous blocks
  "context": {
    "workflowId": "string",
    "executionId": "string", 
    "userId": "string",
    "timestamp": "string"
  },
  "variables": {} // Workflow variables
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='outputs' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Output Schema</CardTitle>
              <CardDescription>
                This block outputs detected wallet events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "success": true,
  "events": [{
    "eventType": "transfer",
    "txHash": "0x...",
    "blockNumber": 12345,
    "timestamp": "2024-01-01T00:00:00Z",
    "fromAddress": "sei1...",
    "toAddress": "sei1...",
    "amount": 1000000,
    "tokenDenom": "usei"
  }],
  "totalEvents": 1,
  "network": "1328",
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
                Execution Status
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <Badge variant='outline'>{executionStatus}</Badge>
              </CardTitle>
              <CardDescription>
                Monitor block execution and test configuration
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {executionData?.error && (
                <div className='flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded'>
                  <AlertTriangle className='h-5 w-5 text-red-500 mt-0.5' />
                  <div>
                    <h4 className='font-medium text-red-800'>
                      Execution Error
                    </h4>
                    <p className='text-sm text-red-600 mt-1'>
                      {executionData.error}
                    </p>
                  </div>
                </div>
              )}

              {executionData?.lastResponse && (
                <div>
                  <h4 className='font-medium mb-2'>Last Response</h4>
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
                  Test Configuration
                </Button>
              )}

              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <span className='font-medium'>Start Time:</span>
                  <p className='text-gray-600'>
                    {executionData?.startTime || "Not started"}
                  </p>
                </div>
                <div>
                  <span className='font-medium'>Duration:</span>
                  <p className='text-gray-600'>
                    {executionData?.duration
                      ? `${executionData.duration}ms`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
