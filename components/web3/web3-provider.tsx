"use client"

import type * as React from "react"
import { createContext, useContext, useState, useEffect } from "react"

// Define types for our Web3 context
type Chain = {
  id: number
  name: string
  rpcUrl: string
}

type Wallet = {
  address: string
  balance: string
  connected: boolean
  chainId?: number
}

type Web3ContextType = {
  wallet: Wallet | null
  chain: Chain | null
  supportedChains: Chain[]
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchChain: (chainId: number) => Promise<void>
  sendTransaction: (to: string, amount: string, token?: string) => Promise<{ hash: string }>
  getBalance: (address: string, token?: string) => Promise<string>
  isLoading: boolean
  walletConnectProjectId: string
}

// Create the context with a default value
const Web3Context = createContext<Web3ContextType>({
  wallet: null,
  chain: null,
  supportedChains: [],
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchChain: async () => {},
  sendTransaction: async () => ({ hash: "" }),
  getBalance: async () => "0",
  isLoading: false,
  walletConnectProjectId: "",
})

// Define supported chains
const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 1,
    name: "Ethereum",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://eth.llamarpc.com",
  },
  {
    id: 10,
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
  },
  {
    id: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
  },
  {
    id: 42161,
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
  },
  {
    id: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
  },
]

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [chain, setChain] = useState<Chain | null>(SUPPORTED_CHAINS[0])
  const [isLoading, setIsLoading] = useState(false)
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        // Check if we have a stored wallet address
        const storedAddress = localStorage.getItem("walletAddress")
        const storedChainId = localStorage.getItem("walletChainId")

        if (storedAddress) {
          setWallet({
            address: storedAddress,
            balance: "1.5", // Mock balance
            connected: true,
            chainId: storedChainId ? Number.parseInt(storedChainId) : 1,
          })

          // Set the chain based on stored chainId
          if (storedChainId) {
            const chainId = Number.parseInt(storedChainId)
            const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === chainId)
            if (selectedChain) {
              setChain(selectedChain)
            }
          }
        }
      } catch (error) {
        console.error("Failed to restore wallet connection:", error)
      }
    }

    checkExistingConnection()
  }, [])

  // Mock implementation for demo purposes
  const connectWallet = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would connect to an actual wallet using WalletConnect
      // For now, we'll simulate a connection with a mock address
      setTimeout(() => {
        const mockAddress = "0x1234...5678"
        const chainId = chain?.id || 1

        setWallet({
          address: mockAddress,
          balance: "1.5",
          connected: true,
          chainId,
        })

        // Store the address and chain for persistence
        localStorage.setItem("walletAddress", mockAddress)
        localStorage.setItem("walletChainId", chainId.toString())

        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setWallet(null)
    localStorage.removeItem("walletAddress")
    localStorage.removeItem("walletChainId")
  }

  const switchChain = async (chainId: number) => {
    setIsLoading(true)
    try {
      const newChain = SUPPORTED_CHAINS.find((c) => c.id === chainId)
      if (newChain) {
        setChain(newChain)

        // Update the wallet's chainId
        if (wallet) {
          const updatedWallet = { ...wallet, chainId }
          setWallet(updatedWallet)
          localStorage.setItem("walletChainId", chainId.toString())
        }
      }
      setIsLoading(false)
    } catch (error) {
      console.error("Failed to switch chain:", error)
      setIsLoading(false)
    }
  }

  const sendTransaction = async (to: string, amount: string, token?: string) => {
    setIsLoading(true)
    try {
      // Mock transaction
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsLoading(false)
      return { hash: "0xabcd...1234" }
    } catch (error) {
      console.error("Transaction failed:", error)
      setIsLoading(false)
      throw error
    }
  }

  const getBalance = async (address: string, token?: string) => {
    try {
      // Mock balance check
      await new Promise((resolve) => setTimeout(resolve, 500))
      return token ? "100" : "1.5"
    } catch (error) {
      console.error("Failed to get balance:", error)
      return "0"
    }
  }

  return (
    <Web3Context.Provider
      value={{
        wallet,
        chain,
        supportedChains: SUPPORTED_CHAINS,
        connectWallet,
        disconnectWallet,
        switchChain,
        sendTransaction,
        getBalance,
        isLoading,
        walletConnectProjectId,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => useContext(Web3Context)
