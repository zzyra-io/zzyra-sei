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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, Play, AlertTriangle, Shield, Code } from "lucide-react";
import { z } from "zod";
import {
  seiSmartContractCallSchema,
  type SeiSmartContractCallConfig,
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

export default function SeiSmartContractCallConfig({
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
  const typedConfig: SeiSmartContractCallConfig = {
    network: "1328",
    contractAddress: "",
    functionName: "",
    walletConfig: { type: "magic_wallet" },
    value: 0,
    waitForConfirmation: true,
    confirmationTimeout: 60000,
    ...config,
  } as SeiSmartContractCallConfig;

  const validateConfig = useCallback((configToValidate: any) => {
    try {
      seiSmartContractCallSchema.configSchema.parse(configToValidate);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path.join(".")] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  }, []);

  const updateConfig = useCallback(
    (updates: Partial<SeiSmartContractCallConfig>) => {
      const newConfig = { ...typedConfig, ...updates };
      validateConfig(newConfig);
      onChange(newConfig);
    },
    [typedConfig, validateConfig, onChange]
  );

  const addFunctionParam = () => {
    const newParams = [
      ...(typedConfig.functionParams || []),
      { name: "", type: "string", value: "" },
    ];
    updateConfig({ functionParams: newParams });
  };

  const removeFunctionParam = (index: number) => {
    const newParams = (typedConfig.functionParams || []).filter(
      (_, i) => i !== index
    );
    updateConfig({ functionParams: newParams });
  };

  const updateFunctionParam = (index: number, field: string, value: any) => {
    const newParams = [...(typedConfig.functionParams || [])];
    newParams[index] = { ...newParams[index], [field]: value };
    updateConfig({ functionParams: newParams });
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
      <Alert>
        <Shield className='h-4 w-4' />
        <AlertDescription>
          Smart contract calls can execute transactions on the blockchain and
          may involve costs. Always test on testnet first and verify contract
          addresses carefully.
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
          {/* Network & Contract */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Configuration</CardTitle>
              <CardDescription>
                Specify the smart contract to interact with
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
                  <Label htmlFor='contractAddress'>Contract Address</Label>
                  <Input
                    id='contractAddress'
                    placeholder='sei1... or 0x...'
                    value={typedConfig.contractAddress}
                    onChange={(e) =>
                      updateConfig({ contractAddress: e.target.value })
                    }
                  />
                  {validationErrors.contractAddress && (
                    <p className='text-sm text-red-500 mt-1'>
                      {validationErrors.contractAddress}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Function Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Function Configuration</CardTitle>
              <CardDescription>
                Specify the function to call and its parameters
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='functionName'>Function Name</Label>
                <Input
                  id='functionName'
                  placeholder='transfer'
                  value={typedConfig.functionName}
                  onChange={(e) =>
                    updateConfig({ functionName: e.target.value })
                  }
                />
                {validationErrors.functionName && (
                  <p className='text-sm text-red-500 mt-1'>
                    {validationErrors.functionName}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor='abi'>ABI (Optional)</Label>
                <Textarea
                  id='abi'
                  placeholder='[{...}] - JSON ABI of the contract'
                  value={typedConfig.abi || ""}
                  onChange={(e) => updateConfig({ abi: e.target.value })}
                  className='h-24'
                />
              </div>

              <div>
                <Label htmlFor='functionSignature'>
                  Function Signature (Alternative to ABI)
                </Label>
                <Input
                  id='functionSignature'
                  placeholder='transfer(address,uint256)'
                  value={typedConfig.functionSignature || ""}
                  onChange={(e) =>
                    updateConfig({ functionSignature: e.target.value })
                  }
                />
              </div>

              {/* Function Parameters */}
              <div>
                <div className='flex justify-between items-center'>
                  <Label>Function Parameters</Label>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={addFunctionParam}>
                    <Plus className='h-4 w-4 mr-2' />
                    Add Parameter
                  </Button>
                </div>
                <div className='space-y-2'>
                  {(typedConfig.functionParams || []).map((param, index) => (
                    <div key={index} className='grid grid-cols-4 gap-2'>
                      <Input
                        placeholder='Parameter name'
                        value={param.name}
                        onChange={(e) =>
                          updateFunctionParam(index, "name", e.target.value)
                        }
                      />
                      <Select
                        value={param.type}
                        onValueChange={(value) =>
                          updateFunctionParam(index, "type", value)
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='string'>String</SelectItem>
                          <SelectItem value='uint256'>Uint256</SelectItem>
                          <SelectItem value='address'>Address</SelectItem>
                          <SelectItem value='bool'>Boolean</SelectItem>
                          <SelectItem value='bytes'>Bytes</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder='Value'
                        value={param.value}
                        onChange={(e) =>
                          updateFunctionParam(index, "value", e.target.value)
                        }
                      />
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => removeFunctionParam(index)}>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-4 w-4' />
                Wallet Configuration
              </CardTitle>
              <CardDescription>
                Configure wallet for transaction signing
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='walletType'>Wallet Type</Label>
                <Select
                  value={typedConfig.walletConfig.type}
                  onValueChange={(value) =>
                    updateConfig({
                      walletConfig: {
                        ...typedConfig.walletConfig,
                        type: value as any,
                      },
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
              </div>

              {typedConfig.walletConfig.type !== "magic_wallet" && (
                <Alert>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>
                    Private keys and mnemonics are encrypted and stored
                    securely. Consider using Magic Wallet for enhanced security.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Transaction Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Settings</CardTitle>
              <CardDescription>
                Configure gas, value, and confirmation settings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='value'>Value (SEI)</Label>
                  <Input
                    id='value'
                    type='number'
                    min='0'
                    step='0.000001'
                    value={typedConfig.value}
                    onChange={(e) =>
                      updateConfig({ value: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='confirmationTimeout'>
                    Confirmation Timeout (ms)
                  </Label>
                  <Input
                    id='confirmationTimeout'
                    type='number'
                    min='1000'
                    value={typedConfig.confirmationTimeout}
                    onChange={(e) =>
                      updateConfig({
                        confirmationTimeout: parseInt(e.target.value) || 60000,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor='memo'>Memo (Optional)</Label>
                <Input
                  id='memo'
                  placeholder='Transaction memo'
                  value={typedConfig.memo || ""}
                  onChange={(e) => updateConfig({ memo: e.target.value })}
                />
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='waitForConfirmation'
                  checked={typedConfig.waitForConfirmation}
                  onCheckedChange={(checked) =>
                    updateConfig({ waitForConfirmation: !!checked })
                  }
                />
                <Label htmlFor='waitForConfirmation'>
                  Wait for confirmation
                </Label>
              </div>

              {/* Gas Settings */}
              <div className='space-y-2'>
                <Label>Gas Settings (Optional)</Label>
                <div className='grid grid-cols-3 gap-2'>
                  <div>
                    <Label htmlFor='gasLimit' className='text-sm'>
                      Gas Limit
                    </Label>
                    <Input
                      id='gasLimit'
                      type='number'
                      placeholder='Auto'
                      value={typedConfig.gasSettings?.gasLimit || ""}
                      onChange={(e) =>
                        updateConfig({
                          gasSettings: {
                            ...typedConfig.gasSettings,
                            gasLimit: parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='gasPrice' className='text-sm'>
                      Gas Price
                    </Label>
                    <Input
                      id='gasPrice'
                      type='number'
                      placeholder='Auto'
                      value={typedConfig.gasSettings?.gasPrice || ""}
                      onChange={(e) =>
                        updateConfig({
                          gasSettings: {
                            ...typedConfig.gasSettings,
                            gasPrice: parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div className='flex items-end'>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='estimateGas'
                        checked={typedConfig.gasSettings?.estimateGas ?? true}
                        onCheckedChange={(checked) =>
                          updateConfig({
                            gasSettings: {
                              ...typedConfig.gasSettings,
                              estimateGas: !!checked,
                            },
                          })
                        }
                      />
                      <Label htmlFor='estimateGas' className='text-sm'>
                        Auto Estimate
                      </Label>
                    </div>
                  </div>
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
                This block accepts dynamic parameters and gas overrides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "data": "any", // Standard workflow data
  "context": {
    "workflowId": "string",
    "executionId": "string",
    "userId": "string", 
    "timestamp": "string"
  },
  "variables": {},
  "dynamicParams": {
    "recipient": "sei1...",
    "amount": 1000000
  },
  "gasOverride": {
    "gasLimit": 200000,
    "gasPrice": 1000000000
  }
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
                Transaction result with contract execution details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className='bg-gray-100 p-4 rounded text-sm'>
                {`{
  "success": true,
  "transaction": {
    "txHash": "0x...",
    "status": "confirmed",
    "blockNumber": 12345,
    "gasUsed": 150000,
    "fees": 0.001
  },
  "contractAddress": "sei1...",
  "functionName": "transfer",
  "returnData": "0x...",
  "events": [{
    "eventName": "Transfer", 
    "data": {...}
  }],
  "executionTime": 2500,
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
                <Code className='h-4 w-4' />
                Execution Status
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <Badge variant='outline'>{executionStatus}</Badge>
              </CardTitle>
              <CardDescription>
                Monitor contract execution and test configuration
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {executionData?.error && (
                <div className='flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded'>
                  <AlertTriangle className='h-5 w-5 text-red-500 mt-0.5' />
                  <div>
                    <h4 className='font-medium text-red-800'>
                      Contract Execution Error
                    </h4>
                    <p className='text-sm text-red-600 mt-1'>
                      {executionData.error}
                    </p>
                  </div>
                </div>
              )}

              {executionData?.lastResponse && (
                <div>
                  <h4 className='font-medium mb-2'>Last Transaction Result</h4>
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
                  Test Contract Call
                </Button>
              )}

              <Alert>
                <AlertTriangle className='h-4 w-4' />
                <AlertDescription>
                  Testing will execute a real transaction on the selected
                  network. Make sure you have sufficient funds and have verified
                  the contract details.
                </AlertDescription>
              </Alert>

              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <span className='font-medium'>Start Time:</span>
                  <p className='text-gray-600'>
                    {executionData?.startTime || "Not executed"}
                  </p>
                </div>
                <div>
                  <span className='font-medium'>Execution Time:</span>
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
