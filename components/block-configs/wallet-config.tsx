"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface WalletConfigProps {
  config: any
  onChange: (config: any) => void
}

export function WalletConfig({ config, onChange }: WalletConfigProps) {
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
        <Label htmlFor="operation">Operation</Label>
        <Select value={config.operation || "connect"} onValueChange={(value) => handleChange("operation", value)}>
          <SelectTrigger id="operation">
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="connect">Connect Wallet</SelectItem>
            <SelectItem value="disconnect">Disconnect Wallet</SelectItem>
            <SelectItem value="check-balance">Check Balance</SelectItem>
            <SelectItem value="sign-message">Sign Message</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.operation === "check-balance" && (
        <div className="space-y-2">
          <Label htmlFor="address">Wallet Address</Label>
          <Input
            id="address"
            placeholder="0x..."
            value={config.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </div>
      )}

      {config.operation === "sign-message" && (
        <div className="space-y-2">
          <Label htmlFor="message">Message to Sign</Label>
          <Input
            id="message"
            placeholder="Enter message to sign"
            value={config.message || ""}
            onChange={(e) => handleChange("message", e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="useConnectedWallet"
          checked={config.useConnectedWallet !== false}
          onCheckedChange={(checked) => handleChange("useConnectedWallet", checked)}
        />
        <Label htmlFor="useConnectedWallet">Use connected wallet</Label>
      </div>
    </div>
  )
}
