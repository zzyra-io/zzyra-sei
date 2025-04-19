"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { openai } from "@ai-sdk/openai"
import { goatClient } from "./client"

type GoatContextType = {
  isInitialized: boolean
  initialize: (config: {
    evmPrivateKey?: string
    solanaPrivateKey?: string
    rpcUrls?: Record<string, string>
  }) => Promise<void>
  executeWithAI: (options: {
    chain: string
    prompt: string
    maxSteps?: number
  }) => Promise<{ text: string }>
  supportedChains: string[]
}

const GoatContext = createContext<GoatContextType | undefined>(undefined)

export function GoatProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const { address } = useAccount()

  const initialize = async (config: {
    evmPrivateKey?: string
    solanaPrivateKey?: string
    rpcUrls?: Record<string, string>
  }) => {
    await goatClient.initialize(config)
    setIsInitialized(true)
  }

  const executeWithAI = async (options: {
    chain: string
    prompt: string
    maxSteps?: number
  }) => {
    return goatClient.executeWithAI({
      ...options,
      model: openai("gpt-4o"),
    })
  }

  // Reset initialization when wallet changes
  useEffect(() => {
    setIsInitialized(false)
  }, [address])

  return (
    <GoatContext.Provider
      value={{
        isInitialized,
        initialize,
        executeWithAI,
        supportedChains: ["ethereum", "optimism", "polygon", "arbitrum", "base", "solana"],
      }}
    >
      {children}
    </GoatContext.Provider>
  )
}

export function useGoat() {
  const context = useContext(GoatContext)
  if (context === undefined) {
    throw new Error("useGoat must be used within a GoatProvider")
  }
  return context
}
