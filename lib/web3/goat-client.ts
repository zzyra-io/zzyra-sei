import { GoatClient } from "@goat-sdk/core"

// Initialize the Goat client
let goatClient: GoatClient | null = null

export function getGoatClient() {
  if (!goatClient) {
    goatClient = new GoatClient({
      apiKey: process.env.NEXT_PUBLIC_GOAT_API_KEY, // Optional if you have an API key
    })
  }
  return goatClient
}

// Utility functions for common blockchain operations
export async function getTokenBalances(address: string, chainId: number) {
  const client = getGoatClient()
  return client.tokens.getTokenBalances({
    address,
    chainId,
  })
}

export async function getTransactionHistory(address: string, chainId: number) {
  const client = getGoatClient()
  return client.account.getTransactions({
    address,
    chainId,
  })
}

export async function getNFTs(address: string, chainId: number) {
  const client = getGoatClient()
  return client.nft.getNFTs({
    address,
    chainId,
  })
}

export async function getTokenPrice(tokenAddress: string, chainId: number) {
  const client = getGoatClient()
  return client.tokens.getPrice({
    tokenAddress,
    chainId,
  })
}
