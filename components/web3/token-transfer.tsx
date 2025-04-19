"use client"

import type React from "react"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useWeb3 } from "@/components/web3/web3-provider"
import { sendTokens } from "@/lib/web3/contracts"
import { Loader2, Send } from "lucide-react"

interface TokenTransferProps {
  tokenSymbol: string
  className?: string
}

export function TokenTransfer({ tokenSymbol, className }: TokenTransferProps) {
  const { address, chainId, isConnected } = useWeb3()
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !address || !chainId) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to transfer tokens.",
        variant: "destructive",
      })
      return
    }

    if (!recipient || !amount) {
      toast({
        title: "Missing information",
        description: "Please provide both recipient address and amount.",
        variant: "destructive",
      })
      return
    }

    // Validate recipient address
    if (!ethers.utils.isAddress(recipient)) {
      toast({
        title: "Invalid address",
        description: "Please provide a valid Ethereum address.",
        variant: "destructive",
      })
      return
    }

    // Validate amount
    if (isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please provide a valid amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create a provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()

      // Send the tokens
      const tx = await sendTokens(tokenSymbol, chainId, recipient, amount, signer)

      toast({
        title: "Transfer successful",
        description: `Successfully transferred ${amount} ${tokenSymbol} to ${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`,
      })

      // Reset form
      setRecipient("")
      setAmount("")
    } catch (error) {
      console.error("Error transferring tokens:", error)
      toast({
        title: "Transfer failed",
        description: error instanceof Error ? error.message : "Failed to transfer tokens. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transfer {tokenSymbol}</CardTitle>
          <CardDescription>Connect your wallet to transfer tokens</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Transfer {tokenSymbol}</CardTitle>
        <CardDescription>Send {tokenSymbol} tokens to another address</CardDescription>
      </CardHeader>
      <form onSubmit={handleTransfer}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex items-center">
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                required
                className="rounded-r-none"
              />
              <div className="flex h-10 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm">
                {tokenSymbol}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Transfer {tokenSymbol}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
