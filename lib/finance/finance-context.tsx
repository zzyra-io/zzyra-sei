"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import { useWeb3 } from "@/components/web3/web3-provider"

// Define types for our financial operations
type FinanceOperation = {
  type: "balance" | "transfer" | "swap" | "custom"
  params: Record<string, any>
}

type FinanceContextType = {
  executeOperation: (operation: FinanceOperation) => Promise<any>
  executeWithAI: (prompt: string) => Promise<any>
  isProcessing: boolean
  lastResult: any
}

// Create the context with a default value
const FinanceContext = createContext<FinanceContextType>({
  executeOperation: async () => {},
  executeWithAI: async () => {},
  isProcessing: false,
  lastResult: null,
})

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { sendTransaction, getBalance } = useWeb3()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  // Execute a financial operation
  const executeOperation = async (operation: FinanceOperation) => {
    setIsProcessing(true)
    try {
      let result

      switch (operation.type) {
        case "balance":
          result = await getBalance(operation.params.address, operation.params.token)
          break
        case "transfer":
          result = await sendTransaction(operation.params.to, operation.params.amount, operation.params.token)
          break
        case "swap":
          // Mock swap implementation
          await new Promise((resolve) => setTimeout(resolve, 2000))
          result = {
            hash: "0xswap...1234",
            fromAmount: operation.params.fromAmount,
            toAmount: (Number.parseFloat(operation.params.fromAmount) * 0.95).toString(),
          }
          break
        case "custom":
          // Handle custom operations
          result = { message: "Custom operation executed", params: operation.params }
          break
        default:
          throw new Error(`Unsupported operation type: ${operation.type}`)
      }

      setLastResult(result)
      setIsProcessing(false)
      return result
    } catch (error) {
      console.error("Operation failed:", error)
      setIsProcessing(false)
      throw error
    }
  }

  // Execute an operation using AI
  const executeWithAI = async (prompt: string) => {
    setIsProcessing(true)
    try {
      // Mock AI processing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simple parsing logic (in a real implementation, this would use an actual AI model)
      let operation: FinanceOperation

      if (prompt.toLowerCase().includes("balance")) {
        operation = {
          type: "balance",
          params: { address: "0x1234...5678" },
        }
      } else if (prompt.toLowerCase().includes("send") || prompt.toLowerCase().includes("transfer")) {
        operation = {
          type: "transfer",
          params: { to: "0x8765...4321", amount: "0.1" },
        }
      } else if (prompt.toLowerCase().includes("swap")) {
        operation = {
          type: "swap",
          params: { fromAmount: "10", fromToken: "USDC", toToken: "ETH" },
        }
      } else {
        operation = {
          type: "custom",
          params: { prompt },
        }
      }

      const result = await executeOperation(operation)
      return result
    } catch (error) {
      console.error("AI execution failed:", error)
      setIsProcessing(false)
      throw error
    }
  }

  return (
    <FinanceContext.Provider
      value={{
        executeOperation,
        executeWithAI,
        isProcessing,
        lastResult,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export const useFinance = () => useContext(FinanceContext)
