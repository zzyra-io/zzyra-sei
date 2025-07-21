'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Image, Play, AlertTriangle } from 'lucide-react';

interface BlockConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: 'idle' | 'running' | 'success' | 'error' | 'warning';
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastResponse?: Record<string, unknown>;
  };
  onTest?: () => void;
}

export default function SeiNftConfig({
  config,
  onChange,
  executionStatus = 'idle',
  executionData,
  onTest,
}: BlockConfigProps) {
  const [activeTab, setActiveTab] = useState('config');

  const typedConfig = {
    network: 'sei-testnet',
    operation: 'monitor',
    walletConfig: { type: 'magic_wallet' },
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
      case 'running': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NFT Operation</CardTitle>
              <CardDescription>Configure NFT operation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Network</Label>
                  <Select
                    value={typedConfig.network}
                    onValueChange={(value) => updateConfig({ network: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sei-testnet">Sei Testnet</SelectItem>
                      <SelectItem value="sei-mainnet">Sei Mainnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operation</Label>
                  <Select
                    value={typedConfig.operation}
                    onValueChange={(value) => updateConfig({ operation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monitor">Monitor NFTs</SelectItem>
                      <SelectItem value="mint">Mint NFT</SelectItem>
                      <SelectItem value="transfer">Transfer NFT</SelectItem>
                      <SelectItem value="burn">Burn NFT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Contract Address</Label>
                <Input
                  placeholder="sei1..."
                  value={typedConfig.contractAddress || ''}
                  onChange={(e) => updateConfig({ contractAddress: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inputs">
          <Card>
            <CardHeader>
              <CardTitle>Input Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm">
{`{
  "dynamicTokenIds": ["1", "2"],
  "dynamicRecipient": "sei1...",
  "dynamicMetadata": {
    "name": "NFT Name",
    "description": "Description"
  }
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outputs">
          <Card>
            <CardHeader>
              <CardTitle>Output Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm">
{`{
  "success": true,
  "operation": "mint",
  "mintResult": {
    "tokenIds": ["123"],
    "recipient": "sei1...",
    "txHash": "0x..."
  }
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Execution Status
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <Badge variant="outline">{executionStatus}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {executionData?.error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">NFT Operation Error</h4>
                    <p className="text-sm text-red-600 mt-1">{executionData.error}</p>
                  </div>
                </div>
              )}

              {onTest && (
                <Button onClick={onTest} disabled={executionStatus === 'running'} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Test NFT Operation
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}