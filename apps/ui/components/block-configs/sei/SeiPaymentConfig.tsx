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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Plus, Trash2, Play, AlertTriangle, Shield } from "lucide-react";

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

export default function SeiPaymentConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
}: BlockConfigProps) {
  const [activeTab, setActiveTab] = useState("config");

  const typedConfig = {
    network: "1328",
    paymentType: "single",
    singlePayment: { recipient: "", amount: 0, tokenDenom: "usei" },
    walletConfig: { type: "magic_wallet" },
    ...config,
  };

  const updateConfig = useCallback(
    (updates: Partial<typeof typedConfig>) => {
      onChange({ ...typedConfig, ...updates });
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
      <Alert>
        <Shield className='h-4 w-4' />
        <AlertDescription>
          Payments will be executed on the blockchain and may incur fees. Always
          verify recipient addresses.
        </AlertDescription>
      </Alert>

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
              <CardTitle>Payment Configuration</CardTitle>
              <CardDescription>
                Configure payment details and recipients
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label>Network</Label>
                  <Select
                    value={typedConfig.network}
                    onValueChange={(value) => updateConfig({ network: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1328'>Sei Testnet</SelectItem>
                      <SelectItem value='sei-mainnet'>Sei Mainnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Type</Label>
                  <Select
                    value={typedConfig.paymentType}
                    onValueChange={(value) =>
                      updateConfig({ paymentType: value })
                    }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='single'>Single Payment</SelectItem>
                      <SelectItem value='batch'>Batch Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {typedConfig.paymentType === "single" && (
                <div className='space-y-4'>
                  <div>
                    <Label>Recipient Address</Label>
                    <Input
                      placeholder='sei1... or 0x...'
                      value={typedConfig.singlePayment?.recipient || ""}
                      onChange={(e) =>
                        updateConfig({
                          singlePayment: {
                            ...typedConfig.singlePayment,
                            recipient: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type='number'
                        step='0.000001'
                        value={typedConfig.singlePayment?.amount || 0}
                        onChange={(e) =>
                          updateConfig({
                            singlePayment: {
                              ...typedConfig.singlePayment,
                              amount: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Token</Label>
                      <Input
                        placeholder='usei'
                        value={typedConfig.singlePayment?.tokenDenom || "usei"}
                        onChange={(e) =>
                          updateConfig({
                            singlePayment: {
                              ...typedConfig.singlePayment,
                              tokenDenom: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wallet Configuration</CardTitle>
              <CardDescription>
                Select wallet for signing transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={typedConfig.walletConfig?.type || "magic_wallet"}
                onValueChange={(value) =>
                  updateConfig({
                    walletConfig: { type: value },
                  })
                }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='magic_wallet'>
                    Magic Wallet (Recommended)
                  </SelectItem>
                  <SelectItem value='private_key'>Private Key</SelectItem>
                  <SelectItem value='mnemonic'>Mnemonic</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='inputs'>
          <Card>
            <CardHeader>
              <CardTitle>Input Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "dynamicPayments": [{
    "recipient": "sei1...",
    "amount": 1.5,
    "tokenDenom": "usei"
  }]
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='outputs'>
          <Card>
            <CardHeader>
              <CardTitle>Output Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "success": true,
  "transactions": [{
    "recipient": "sei1...",
    "amount": 1.5,
    "txHash": "0x...",
    "status": "confirmed"
  }],
  "summary": {
    "totalAmount": 1.5,
    "totalFees": 0.001
  }
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='execution'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Send className='h-4 w-4' />
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
                    <h4 className='font-medium text-red-800'>Payment Error</h4>
                    <p className='text-sm text-red-600 mt-1'>
                      {executionData.error}
                    </p>
                  </div>
                </div>
              )}

              {onTest && (
                <Button
                  onClick={onTest}
                  disabled={executionStatus === "running"}
                  className='w-full'>
                  <Play className='h-4 w-4 mr-2' />
                  Test Payment (Testnet Only)
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
