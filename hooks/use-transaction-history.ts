"use client"

import { useQuery } from "@tanstack/react-query"
import { useAccount, useNetwork } from "wagmi"
import { getTransactionHistory } from "@/lib/web3/goat-client"

export function useTransactionHistory() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()

  return useQuery(
    ["transactionHistory", address, chain?.id],
    async () => {
      if (!address || !chain?.id) {
        throw new Error("Wallet not connected")
      }

      return getTransactionHistory(address, chain.id)
    },
    {
      enabled: isConnected && !!address && !!chain?.id,
      staleTime: 30 * 1000, // 30 seconds
    },
  )
}
