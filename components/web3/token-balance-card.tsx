"use client"

import { useAccount } from "wagmi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { FadeIn } from "@/components/animations/fade-in"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw } from "lucide-react"
import { useTokenBalances } from "@/hooks/use-token-balances"

interface TokenBalanceCardProps {
  tokenSymbol: string
  tokenAddress?: string
  className?: string
}

export function TokenBalanceCard({ tokenSymbol, tokenAddress, className }: TokenBalanceCardProps) {
  const { isConnected } = useAccount()
  const { data, isLoading, isError, error, refetch, isFetching } = useTokenBalances()

  // Find the specific token balance from the balances array
  const tokenBalance = data?.balances?.find((token) => token.symbol.toLowerCase() === tokenSymbol.toLowerCase())

  const formattedBalance = tokenBalance ? Number.parseFloat(tokenBalance.balance).toFixed(6) : "0.00"

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
    <FadeIn>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{tokenSymbol} Balance</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              disabled={isFetching}
              onClick={() => refetch()}
              className="p-1 h-8 w-8 rounded-full"
              title="Refresh balance"
            >
              <motion.div
                animate={isFetching ? { rotate: 360 } : {}}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "linear" }}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            </Button>
          </div>
          <CardDescription>Current balance in your wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Skeleton className="h-8 w-24" />
              </motion.div>
            ) : isError ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-sm text-destructive">{error?.message || "Failed to load balance"}</p>
              </motion.div>
            ) : (
              <motion.div
                key="data"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-baseline"
              >
                <p className="text-2xl font-bold mr-2">{formattedBalance}</p>
                <p className="text-sm text-muted-foreground">{tokenSymbol}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
