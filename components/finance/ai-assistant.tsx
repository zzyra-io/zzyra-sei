"use client"

import type React from "react"

import { useState } from "react"
import { useFinance } from "@/lib/finance/finance-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Send, AlertCircle, CheckCircle } from "lucide-react"

export function AIFinanceAssistant() {
  const { executeWithAI, isProcessing, lastResult } = useFinance()
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setError(null)
    setResponse(null)

    try {
      const result = await executeWithAI(prompt)

      // Format the response based on the result
      let formattedResponse = "Operation completed successfully."

      if (result.hash) {
        formattedResponse = `Transaction submitted with hash: ${result.hash}`
      } else if (typeof result === "string") {
        formattedResponse = `Balance: ${result}`
      } else if (result.fromAmount && result.toAmount) {
        formattedResponse = `Swapped ${result.fromAmount} for ${result.toAmount}`
      }

      setResponse(formattedResponse)
      setPrompt("")
    } catch (err) {
      setError("Failed to execute operation. Please try again.")
      console.error(err)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Financial Assistant</CardTitle>
        <CardDescription>
          Describe what financial operation you want to perform, and the AI will execute it for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Example: Check my ETH balance, Send 0.1 ETH to 0x123..., Swap 10 USDC for ETH"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
            disabled={isProcessing}
          />

          {response && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="text-green-700 dark:text-green-300">{response}</div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" onClick={handleSubmit} disabled={isProcessing || !prompt.trim()} className="w-full">
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Execute
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
