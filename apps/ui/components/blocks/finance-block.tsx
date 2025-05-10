"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Coins } from "lucide-react"

export type FinanceBlockConfig = {
  operation: "balance" | "transfer" | "swap" | "custom"
  blockchain: string
  useAI: boolean
  prompt?: string
  params?: {
    address?: string
    to?: string
    amount?: string
    token?: string
    fromToken?: string
    toToken?: string
    fromAmount?: string
  }
}

const DEFAULT_CONFIG: FinanceBlockConfig = {
  operation: "balance",
  blockchain: "ethereum",
  useAI: false,
  params: {
    address: "",
  },
}

export function FinanceBlock({
  config = DEFAULT_CONFIG,
  onChange,
}: {
  config: FinanceBlockConfig
  onChange?: (config: FinanceBlockConfig) => void
}) {
  const handleChange = (updates: Partial<FinanceBlockConfig>) => {
    if (onChange) {
      onChange({ ...config, ...updates })
    }
  }

  const handleParamChange = (key: string, value: string) => {
    handleChange({
      params: {
        ...config.params,
        [key]: value,
      },
    })
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Coins className="h-5 w-5 mr-2" />
          Financial Operation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="operation">Operation Type</Label>
          <Select value={config.operation} onValueChange={(value) => handleChange({ operation: value as any })}>
            <SelectTrigger id="operation">
              <SelectValue placeholder="Select operation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance">Check Balance</SelectItem>
              <SelectItem value="transfer">Transfer Tokens</SelectItem>
              <SelectItem value="swap">Swap Tokens</SelectItem>
              <SelectItem value="custom">Custom Operation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blockchain">Blockchain</Label>
          <Select value={config.blockchain} onValueChange={(value) => handleChange({ blockchain: value })}>
            <SelectTrigger id="blockchain">
              <SelectValue placeholder="Select blockchain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="optimism">Optimism</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="arbitrum">Arbitrum</SelectItem>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="solana">Solana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="useAI" checked={config.useAI} onCheckedChange={(checked) => handleChange({ useAI: checked })} />
          <Label htmlFor="useAI">Use AI for this operation</Label>
        </div>

        {config.useAI ? (
          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt</Label>
            <Input
              id="prompt"
              placeholder="Describe what you want to do..."
              value={config.prompt || ""}
              onChange={(e) => handleChange({ prompt: e.target.value })}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {config.operation === "balance" && (
              <div className="space-y-2">
                <Label htmlFor="address">Wallet Address</Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  value={config.params?.address || ""}
                  onChange={(e) => handleParamChange("address", e.target.value)}
                />
              </div>
            )}

            {config.operation === "transfer" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="to">Recipient Address</Label>
                  <Input
                    id="to"
                    placeholder="0x..."
                    value={config.params?.to || ""}
                    onChange={(e) => handleParamChange("to", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    placeholder="0.1"
                    value={config.params?.amount || ""}
                    onChange={(e) => handleParamChange("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Token (optional)</Label>
                  <Input
                    id="token"
                    placeholder="ETH"
                    value={config.params?.token || ""}
                    onChange={(e) => handleParamChange("token", e.target.value)}
                  />
                </div>
              </>
            )}

            {config.operation === "swap" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fromAmount">From Amount</Label>
                  <Input
                    id="fromAmount"
                    placeholder="10"
                    value={config.params?.fromAmount || ""}
                    onChange={(e) => handleParamChange("fromAmount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromToken">From Token</Label>
                  <Input
                    id="fromToken"
                    placeholder="USDC"
                    value={config.params?.fromToken || ""}
                    onChange={(e) => handleParamChange("fromToken", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toToken">To Token</Label>
                  <Input
                    id="toToken"
                    placeholder="ETH"
                    value={config.params?.toToken || ""}
                    onChange={(e) => handleParamChange("toToken", e.target.value)}
                  />
                </div>
              </>
            )}

            {config.operation === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customPrompt">Custom Operation Description</Label>
                <Input
                  id="customPrompt"
                  placeholder="Describe the custom operation..."
                  value={config.prompt || ""}
                  onChange={(e) => handleChange({ prompt: e.target.value })}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
