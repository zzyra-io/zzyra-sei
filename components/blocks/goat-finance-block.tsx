"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

export interface GoatFinanceBlockProps {
  data: {
    operation: string
    chain: string
    prompt: string
    useAI: boolean
    parameters: Record<string, string>
  }
  onChange: (data: any) => void
}

export function GoatFinanceBlock({ data, onChange }: GoatFinanceBlockProps) {
  const [operation, setOperation] = useState(data.operation || "balance")
  const [chain, setChain] = useState(data.chain || "ethereum")
  const [prompt, setPrompt] = useState(data.prompt || "")
  const [useAI, setUseAI] = useState(data.useAI || false)
  const [parameters, setParameters] = useState<Record<string, string>>(data.parameters || {})

  const handleOperationChange = (value: string) => {
    setOperation(value)
    onChange({
      ...data,
      operation: value,
      parameters: getDefaultParameters(value),
    })
  }

  const handleChainChange = (value: string) => {
    setChain(value)
    onChange({
      ...data,
      chain: value,
    })
  }

  const handlePromptChange = (value: string) => {
    setPrompt(value)
    onChange({
      ...data,
      prompt: value,
    })
  }

  const handleUseAIChange = (checked: boolean) => {
    setUseAI(checked)
    onChange({
      ...data,
      useAI: checked,
    })
  }

  const handleParameterChange = (key: string, value: string) => {
    const updatedParameters = { ...parameters, [key]: value }
    setParameters(updatedParameters)
    onChange({
      ...data,
      parameters: updatedParameters,
    })
  }

  const getDefaultParameters = (op: string) => {
    switch (op) {
      case "balance":
        return { address: parameters.address || "" }
      case "transfer":
        return {
          recipient: parameters.recipient || "",
          amount: parameters.amount || "",
          token: parameters.token || "ETH",
        }
      case "swap":
        return {
          fromToken: parameters.fromToken || "ETH",
          toToken: parameters.toToken || "USDC",
          amount: parameters.amount || "",
        }
      default:
        return {}
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GOAT Finance</CardTitle>
        <CardDescription>Execute financial operations using GOAT SDK</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="operation">Operation</Label>
          <Select value={operation} onValueChange={handleOperationChange}>
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
          <Label htmlFor="chain">Blockchain</Label>
          <Select value={chain} onValueChange={handleChainChange}>
            <SelectTrigger id="chain">
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
          <Switch id="useAI" checked={useAI} onCheckedChange={handleUseAIChange} />
          <Label htmlFor="useAI">Use AI for this operation</Label>
        </div>

        {useAI && (
          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe what you want the AI to do..."
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
            />
          </div>
        )}

        {!useAI && (
          <div className="space-y-4">
            {operation === "balance" && (
              <div className="space-y-2">
                <Label htmlFor="address">Wallet Address</Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  value={parameters.address || ""}
                  onChange={(e) => handleParameterChange("address", e.target.value)}
                />
              </div>
            )}

            {operation === "transfer" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={parameters.recipient || ""}
                    onChange={(e) => handleParameterChange("recipient", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    placeholder="0.0"
                    value={parameters.amount || ""}
                    onChange={(e) => handleParameterChange("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Input
                    id="token"
                    placeholder="ETH"
                    value={parameters.token || ""}
                    onChange={(e) => handleParameterChange("token", e.target.value)}
                  />
                </div>
              </>
            )}

            {operation === "swap" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fromToken">From Token</Label>
                  <Input
                    id="fromToken"
                    placeholder="ETH"
                    value={parameters.fromToken || ""}
                    onChange={(e) => handleParameterChange("fromToken", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toToken">To Token</Label>
                  <Input
                    id="toToken"
                    placeholder="USDC"
                    value={parameters.toToken || ""}
                    onChange={(e) => handleParameterChange("toToken", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swapAmount">Amount</Label>
                  <Input
                    id="swapAmount"
                    placeholder="0.0"
                    value={parameters.amount || ""}
                    onChange={(e) => handleParameterChange("amount", e.target.value)}
                  />
                </div>
              </>
            )}

            {operation === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customOperation">Custom Operation Details</Label>
                <Textarea
                  id="customOperation"
                  placeholder="Describe the custom operation..."
                  value={parameters.customOperation || ""}
                  onChange={(e) => handleParameterChange("customOperation", e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
