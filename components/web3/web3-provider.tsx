"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { createConfig, useAccount, useConnect, useDisconnect, useBalance, useSendTransaction, useChainId } from "wagmi"
import { mainnet, polygon, arbitrum, base } from "wagmi/chains"

import { injected, walletConnect } from "wagmi/connectors"
import { QueryClient } from "@tanstack/react-query"
import { getDefaultConfig } from "connectkit"

// Define types for Web3 context
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

// Create context
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

export const config = createConfig(
  getDefaultConfig({
    appName: "Zyra",
    appUrl: "https://zyra.io",
    appIcon: "https://zyra.io/zyra-logo.png",
    connectors: [
      injected(),
      walletConnect({
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
      }),
    ],
    chains: [mainnet, polygon, arbitrum, base],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    ssr: true, // If your dApp uses server side rendering (SSR)
  }),
)

// Web3 Provider Component
export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [chain, setChain] = useState<Chain | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balanceData } = useBalance({ address })
  const { sendTransactionAsync } = useSendTransaction()

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  // Sync wallet state
  useEffect(() => {
    if (isConnected && address && chainId) {
      const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === chainId)
      setWallet({
        address,
        balance: balanceData?.formatted || "0",
        connected: true,
        chainId,
      })
      setChain(selectedChain || null)
    } else {
      setWallet(null)
      setChain(null)
    }
  }, [isConnected, address, chainId, balanceData])

  const connectWallet = async () => {
    setIsLoading(true)
    try {
      // Use the first available connector (usually WalletConnect)
      const connector = connectors[0]
      await connect({ connector })
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    disconnect()
    setWallet(null)
    setChain(null)
  }

  const switchChain = async (chainId: number) => {
    setIsLoading(true)
    try {
      const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === chainId)
      if (!selectedChain) throw new Error("Unsupported chain")

      setChain(selectedChain)
    } catch (error) {
      console.error("Failed to switch chain:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendTransaction = async (to: string, amount: string, token?: string) => {
    setIsLoading(true)
    try {
      if (token) {
        // Handle ERC20 token transactions
        // You'll need to implement token contract interactions
        throw new Error("Token transactions not implemented")
      }

      // Handle native token (ETH) transactions
      const value = BigInt(Math.floor(Number.parseFloat(amount) * 1e18)) // Convert to wei
      const tx = await sendTransactionAsync({
        to: `0x${to}`,
        value,
      })
      return { hash: tx }
    } catch (error) {
      console.error("Failed to send transaction:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const getBalance = async (address: string, token?: string) => {
    setIsLoading(true)
    try {
      if (token) {
        // Handle ERC20 token balance
        // You'll need to implement token contract interactions
        return "0"
      }
      // Return native balance if address matches current wallet
      if (address.toLowerCase() === wallet?.address.toLowerCase()) {
        return balanceData?.formatted || "0"
      }
      // For other addresses, you would need to query the blockchain
      return "0"
    } finally {
      setIsLoading(false)
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

// Hook to use Web3 context
export function useWeb3() {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return context
}
