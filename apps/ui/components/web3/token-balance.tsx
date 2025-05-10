"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWeb3 } from "@/components/web3/web3-provider"
import { getTokenBalance } from "@/lib/web3/contracts"
import { RefreshCw } from "lucide-react"

interface TokenBalanceProps {
  tokenSymbol: string
  className?: string
}

export function TokenBalance({ tokenSymbol, className }: TokenBalanceProps) {
  const { address, chainId, isConnected } = useWeb3()
  const [balance, setBalance] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = async () => {
    if (!isConnected || !address || !chainId) return

    setIsLoading(true)
    setError(null)

    try {
      // Create a provider
      const provider = new ethers.providers.Web3Provider(window.ethereum)

      // Get the token balance
      const balance = await getTokenBalance(tokenSymbol, chainId, address, provider)
      setBalance(balance)
    } catch (err) {
      console.error(`Error fetching ${tokenSymbol} balance:`, err)
      setError(`Failed to fetch ${tokenSymbol} balance`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && address && chainId) {
      fetchBalance()
    } else {
      setBalance(null)
    }
  }, [isConnected, address, chainId, tokenSymbol])

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{tokenSymbol} Balance</CardTitle>
          <CardDescription>Connect your wallet to view balance</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{tokenSymbol} Balance</CardTitle>
          <button
            onClick={fetchBalance}
            disabled={isLoading}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            title="Refresh balance"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <CardDescription>Current balance in your wallet</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : balance !== null ? (
          <p className="text-2xl font-bold">
            {Number.parseFloat(balance).toFixed(6)} {tokenSymbol}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </CardContent>
    </Card>
  )
}
