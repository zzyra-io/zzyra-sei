"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useGoat } from "@/lib/goat/goat-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Loader2, Send, Sparkles } from "lucide-react"
import { InitializeGoat } from "./initialize-goat"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function AIFinanceAssistant() {
  const { isInitialized, executeWithAI, supportedChains } = useGoat()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedChain, setSelectedChain] = useState("ethereum")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return
    if (!isInitialized) {
      toast({
        title: "GOAT SDK not initialized",
        description: "Please initialize GOAT SDK first",
        variant: "destructive",
      })
      return
    }

    const userMessage = input
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const result = await executeWithAI({
        chain: selectedChain,
        prompt: userMessage,
      })

      setMessages((prev) => [...prev, { role: "assistant", content: result.text }])
    } catch (error) {
      console.error("Error executing with AI:", error)
      toast({
        title: "AI execution failed",
        description: error instanceof Error ? error.message : "Failed to execute AI operation",
        variant: "destructive",
      })
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error while processing your request. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isInitialized) {
    return <InitializeGoat />
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Finance Assistant
        </CardTitle>
        <CardDescription>Ask the AI to perform financial operations on {selectedChain}</CardDescription>
        <div className="w-full max-w-[200px]">
          <Select value={selectedChain} onValueChange={setSelectedChain}>
            <SelectTrigger>
              <SelectValue placeholder="Select blockchain" />
            </SelectTrigger>
            <SelectContent>
              {supportedChains.map((chain) => (
                <SelectItem key={chain} value={chain}>
                  {chain.charAt(0).toUpperCase() + chain.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto mb-4 space-y-4">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"
            >
              <Bot className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>Ask the AI to perform financial operations like:</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>"Check my token balances"</li>
                <li>"Send 0.01 ETH to 0x123..."</li>
                <li>"Swap 10 USDC for ETH"</li>
                <li>"What's the current price of ETH?"</li>
              </ul>
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))
          )}
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI to perform financial operations..."
            className="min-h-[60px] flex-1 resize-none"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
