"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface TransactionConfigProps {
  config: any
  onChange: (config: any) => void
}

export function TransactionConfig({ config, onChange }: TransactionConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="blockchain">Blockchain</Label>
        <Select value={config.blockchain || "ethereum"} onValueChange={(value) => handleChange("blockchain", value)}>
          <SelectTrigger id="blockchain">
            <SelectValue placeholder="Select blockchain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ethereum">Ethereum</SelectItem>
            <SelectItem value="polygon">Polygon</SelectItem>
            <SelectItem value="optimism">Optimism</SelectItem>
            <SelectItem value="arbitrum">Arbitrum</SelectItem>
            <SelectItem value="base">Base</SelectItem>
            <SelectItem value="solana">Solana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Transaction Type</Label>
        <Select value={config.type || "transfer"} onValueChange={(value) => handleChange("type", value)}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="transfer">Token Transfer</SelectItem>
            <SelectItem value="contract">Contract Interaction</SelectItem>
            <SelectItem value="swap">Token Swap</SelectItem>
            <SelectItem value="nft">NFT Transaction</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.type === "transfer" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="to">Recipient Address</Label>
            <Input
              id="to"
              placeholder="0x..."
              value={config.to || ""}
              onChange={(e) => handleChange("to", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              placeholder="0.1"
              value={config.amount || ""}
              onChange={(e) => handleChange("amount", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Select value={config.token || "native"} onValueChange={(value) => handleChange("token", value)}>
              <SelectTrigger id="token">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="native">Native Token (ETH/MATIC/etc.)</SelectItem>
                <SelectItem value="usdc">USDC</SelectItem>
                <SelectItem value="usdt">USDT</SelectItem>
                <SelectItem value="dai">DAI</SelectItem>
                <SelectItem value="custom">Custom Token</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.token === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="tokenAddress">Token Contract Address</Label>
              <Input
                id="tokenAddress"
                placeholder="0x..."
                value={config.tokenAddress || ""}
                onChange={(e) => handleChange("tokenAddress", e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {config.type === "contract" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="contractAddress">Contract Address</Label>
            <Input
              id="contractAddress"
              placeholder="0x..."
              value={config.contractAddress || ""}
              onChange={(e) => handleChange("contractAddress", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Method Name</Label>
            <Input
              id="method"
              placeholder="transfer"
              value={config.method || ""}
              onChange={(e) => handleChange("method", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="args">Arguments (JSON)</Label>
            <Textarea
              id="args"
              placeholder='["0x123...", "100"]'
              value={config.args || ""}
              onChange={(e) => handleChange("args", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value (Native Token)</Label>
            <Input
              id="value"
              type="number"
              step="0.000001"
              placeholder="0"
              value={config.value || "0"}
              onChange={(e) => handleChange("value", e.target.value)}
            />
          </div>
        </>
      )}

      {config.type === "swap" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="fromToken">From Token</Label>
            <Select value={config.fromToken || "native"} onValueChange={(value) => handleChange("fromToken", value)}>
              <SelectTrigger id="fromToken">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="native">Native Token (ETH/MATIC/etc.)</SelectItem>
                <SelectItem value="usdc">USDC</SelectItem>
                <SelectItem value="usdt">USDT</SelectItem>
                <SelectItem value="dai">DAI</SelectItem>
                <SelectItem value="custom">Custom Token</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.fromToken === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="fromTokenAddress">From Token Address</Label>
              <Input
                id="fromTokenAddress"
                placeholder="0x..."
                value={config.fromTokenAddress || ""}
                onChange={(e) => handleChange("fromTokenAddress", e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fromAmount">From Amount</Label>
            <Input
              id="fromAmount"
              type="number"
              step="0.000001"
              placeholder="0.1"
              value={config.fromAmount || ""}
              onChange={(e) => handleChange("fromAmount", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toToken">To Token</Label>
            <Select value={config.toToken || "usdc"} onValueChange={(value) => handleChange("toToken", value)}>
              <SelectTrigger id="toToken">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="native">Native Token (ETH/MATIC/etc.)</SelectItem>
                <SelectItem value="usdc">USDC</SelectItem>
                <SelectItem value="usdt">USDT</SelectItem>
                <SelectItem value="dai">DAI</SelectItem>
                <SelectItem value="custom">Custom Token</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.toToken === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="toTokenAddress">To Token Address</Label>
              <Input
                id="toTokenAddress"
                placeholder="0x..."
                value={config.toTokenAddress || ""}
                onChange={(e) => handleChange("toTokenAddress", e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
            <Input
              id="slippage"
              type="number"
              step="0.1"
              placeholder="0.5"
              value={config.slippage || "0.5"}
              onChange={(e) => handleChange("slippage", e.target.value)}
              min="0.1"
              max="100"
            />
          </div>
        </>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="waitForConfirmation"
          checked={config.waitForConfirmation !== false}
          onCheckedChange={(checked) => handleChange("waitForConfirmation", checked)}
        />
        <Label htmlFor="waitForConfirmation">Wait for confirmation</Label>
      </div>
    </div>
  )
}
