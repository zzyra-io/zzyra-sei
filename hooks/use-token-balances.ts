"use client"

import { useQuery } from "@tanstack/react-query"
import { useAccount, useNetwork } from "wagmi"
import { getTokenBalances } from "@/lib/web3/goat-client"

export function useTokenBalances() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()

  return useQuery(
    ["tokenBalances", address, chain?.id],
    async () => {
      if (!address || !chain?.id) {
        throw new Error("Wallet not connected")
      }

      return getTokenBalances(address, chain.id)
    },
    {
      enabled: isConnected && !!address && !!chain?.id,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // 1 minute
    },
  )
}
