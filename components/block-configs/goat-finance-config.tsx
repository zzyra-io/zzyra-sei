"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface GoatFinanceConfigProps {
  config: any
  onChange: (config: any) => void
}

export function GoatFinanceConfig({ config, onChange }: GoatFinanceConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="operation">Operation</Label>
        <Select value={config.operation || "balance"} onValueChange={(value) => handleChange("operation", value)}>
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
        <Select value={config.blockchain || "ethereum"} onValueChange={(value) => handleChange("blockchain", value)}>
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
        <Switch
          id="useAI"
          checked={config.useAI || false}
          onCheckedChange={(checked) => handleChange("useAI", checked)}
        />
        <Label htmlFor="useAI">Use AI for this operation</Label>
      </div>

      {config.useAI ? (
        <div className="space-y-2">
          <Label htmlFor="prompt">AI Prompt</Label>
          <Textarea
            id="prompt"
            placeholder="Describe what you want to do..."
            value={config.prompt || ""}
            onChange={(e) => handleChange("prompt", e.target.value)}
            rows={4}
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
                onChange={(e) => handleChange("params", { ...config.params, address: e.target.value })}
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
                  onChange={(e) => handleChange("params", { ...config.params, to: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  placeholder="0.1"
                  value={config.params?.amount || ""}
                  onChange={(e) => handleChange("params", { ...config.params, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Token (optional)</Label>
                <Input
                  id="token"
                  placeholder="ETH"
                  value={config.params?.token || ""}
                  onChange={(e) => handleChange("params", { ...config.params, token: e.target.value })}
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
                  onChange={(e) => handleChange("params", { ...config.params, fromAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromToken">From Token</Label>
                <Input
                  id="fromToken"
                  placeholder="USDC"
                  value={config.params?.fromToken || ""}
                  onChange={(e) => handleChange("params", { ...config.params, fromToken: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toToken">To Token</Label>
                <Input
                  id="toToken"
                  placeholder="ETH"
                  value={config.params?.toToken || ""}
                  onChange={(e) => handleChange("params", { ...config.params, toToken: e.target.value })}
                />
              </div>
            </>
          )}

          {config.operation === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customPrompt">Custom Operation Description</Label>
              <Textarea
                id="customPrompt"
                placeholder="Describe the custom operation..."
                value={config.prompt || ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
