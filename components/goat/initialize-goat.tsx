"use client"

import { useState } from "react"
import { useGoat } from "@/lib/goat/goat-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { CheckCircle, Key, Shield } from "lucide-react"

export function InitializeGoat() {
  const { isInitialized, initialize, supportedChains } = useGoat()
  const [privateKey, setPrivateKey] = useState("")
  const [selectedChain, setSelectedChain] = useState("ethereum")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleInitialize = async () => {
    if (!privateKey) {
      toast({
        title: "Private key required",
        description: "Please enter a private key to initialize GOAT SDK",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Determine if it's an EVM or Solana private key
      const isEvm = privateKey.startsWith("0x")

      await initialize({
        evmPrivateKey: isEvm ? privateKey : undefined,
        solanaPrivateKey: !isEvm ? privateKey : undefined,
        rpcUrls: {
          [selectedChain]: process.env.NEXT_PUBLIC_RPC_URL || "",
        },
      })

      toast({
        title: "GOAT SDK initialized",
        description: "You can now use AI-powered financial tools",
      })
    } catch (error) {
      console.error("Failed to initialize GOAT SDK:", error)
      toast({
        title: "Initialization failed",
        description: error instanceof Error ? error.message : "Failed to initialize GOAT SDK",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isInitialized) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              GOAT SDK Initialized
            </CardTitle>
            <CardDescription>AI-powered financial tools are ready to use</CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Initialize GOAT SDK
          </CardTitle>
          <CardDescription>Enter a private key to enable AI-powered financial tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chain">Blockchain</Label>
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
          <div className="space-y-2">
            <Label htmlFor="privateKey" className="flex items-center gap-1">
              <Key className="h-3.5 w-3.5" />
              Private Key
            </Label>
            <Input
              id="privateKey"
              type="password"
              placeholder="Enter your private key"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your private key is only stored locally and never sent to our servers
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleInitialize} disabled={isLoading || !privateKey} className="w-full">
            {isLoading ? "Initializing..." : "Initialize GOAT SDK"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
