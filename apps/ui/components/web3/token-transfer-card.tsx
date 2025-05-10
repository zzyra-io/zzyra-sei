"use client"

import type React from "react"

import { useState } from "react"
import { useAccount, useSendTransaction, useWaitForTransaction, usePrepareSendTransaction } from "wagmi"
import { parseEther } from "viem"
import { FadeIn } from "@/components/animations/fade-in"
import { InteractiveButton } from "@/components/animations/interactive-button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Send, CheckCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface TokenTransferCardProps {
  tokenSymbol: string
  className?: string
}

export function TokenTransferCard({ tokenSymbol, className }: TokenTransferCardProps) {
  const { address, isConnected } = useAccount()
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const { toast } = useToast()

  // For now, we only handle ETH transfers using wagmi's built-in hooks
  // For ERC20, we would need to prepare a contract write
  const isNativeToken = tokenSymbol.toUpperCase() === "ETH"

  const { config } = usePrepareSendTransaction({
    to: recipient,
    value: amount ? parseEther(amount) : undefined,
    enabled: isNativeToken && !!recipient && !!amount && recipient.length === 42,
  })

  const { data, sendTransaction, isLoading: isSending } = useSendTransaction(config)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !address) {
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

    if (!isNativeToken) {
      toast({
        title: "Token not supported",
        description: "Currently only native ETH transfers are supported.",
        variant: "destructive",
      })
      return
    }

    try {
      sendTransaction?.()
    } catch (error) {
      console.error("Error transferring tokens:", error)
      toast({
        title: "Transfer failed",
        description: error instanceof Error ? error.message : "Failed to transfer tokens. Please try again.",
        variant: "destructive",
      })
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
    <FadeIn>
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
                disabled={isSending || isConfirming || isSuccess}
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
                  disabled={isSending || isConfirming || isSuccess}
                  required
                  className="rounded-r-none"
                />
                <div className="flex h-10 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm">
                  {tokenSymbol}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-500" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Transaction successful!
                        </p>
                        <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                          <a
                            href={`https://etherscan.io/tx/${data?.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline hover:text-green-600 dark:hover:text-green-200"
                          >
                            View on Etherscan
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
          <CardFooter>
            <InteractiveButton
              type="submit"
              disabled={!sendTransaction || isSending || isConfirming || isSuccess}
              className="w-full"
              scaleOnHover
              scaleOnTap
              ripple
            >
              {isSending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSending ? "Confirming in wallet..." : "Processing transaction..."}
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Transaction Complete
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Transfer {tokenSymbol}
                </>
              )}
            </InteractiveButton>
          </CardFooter>
        </form>
      </Card>
    </FadeIn>
  )
}
