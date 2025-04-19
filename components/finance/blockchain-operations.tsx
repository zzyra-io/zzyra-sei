"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/components/web3/web3-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Send,
  RefreshCw,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Wallet,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WalletConnectDialog } from "@/components/web3/wallet-connect-dialog"

export function BlockchainOperations() {
  const { wallet, sendTransaction, getBalance, isLoading, chain } = useWeb3()
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [token, setToken] = useState("ETH")
  const [fromToken, setFromToken] = useState("ETH")
  const [toToken, setToToken] = useState("USDC")
  const [swapAmount, setSwapAmount] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false)
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null)
  const { toast } = useToast()

  // Reset transaction status when inputs change
  useEffect(() => {
    if (transactionStatus !== "idle") {
      setTransactionStatus("idle")
      setTransactionHash(null)
    }
  }, [recipient, amount, token])

  // Estimate gas when inputs change
  useEffect(() => {
    const estimateGas = async () => {
      if (recipient && amount && wallet) {
        // Mock gas estimation
        setEstimatedGas((Math.random() * 0.005 + 0.001).toFixed(6))
      } else {
        setEstimatedGas(null)
      }
    }

    estimateGas()
  }, [recipient, amount, wallet])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet) {
      setIsWalletDialogOpen(true)
      return
    }

    if (!recipient || !amount) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setTransactionStatus("pending")
      const result = await sendTransaction(recipient, amount, token)
      setTransactionHash(result.hash)
      setTransactionStatus("success")
      toast({
        title: "Transaction sent",
        description: `Transaction hash: ${result.hash}`,
      })
    } catch (error) {
      setTransactionStatus("error")
      toast({
        title: "Transaction failed",
        description: "Failed to send transaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet) {
      setIsWalletDialogOpen(true)
      return
    }

    if (!fromToken || !toToken || !swapAmount) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setTransactionStatus("pending")
      // Mock swap implementation
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setTransactionStatus("success")
      setTransactionHash("0xabcd...1234")
      toast({
        title: "Swap executed",
        description: `Swapped ${swapAmount} ${fromToken} for ${Number(swapAmount) * 0.95} ${toToken}`,
      })
    } catch (error) {
      setTransactionStatus("error")
      toast({
        title: "Swap failed",
        description: "Failed to execute swap. Please try again.",
        variant: "destructive",
      })
    }
  }

  const refreshBalance = async () => {
    if (!wallet) return

    setRefreshing(true)
    try {
      const balance = await getBalance(wallet.address)
      toast({
        title: "Balance refreshed",
        description: `Current balance: ${balance} ETH`,
      })
    } catch (error) {
      toast({
        title: "Failed to refresh balance",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const renderTransactionStatus = () => {
    if (transactionStatus === "idle") return null

    return (
      <div
        className={`mt-4 p-4 rounded-md flex items-start gap-3 ${
          transactionStatus === "pending"
            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50"
            : transactionStatus === "success"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50"
        }`}
      >
        {transactionStatus === "pending" ? (
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin mt-0.5" />
        ) : transactionStatus === "success" ? (
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
        )}
        <div>
          <h4
            className={`text-sm font-medium ${
              transactionStatus === "pending"
                ? "text-blue-700 dark:text-blue-300"
                : transactionStatus === "success"
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
            }`}
          >
            {transactionStatus === "pending"
              ? "Transaction Pending"
              : transactionStatus === "success"
                ? "Transaction Successful"
                : "Transaction Failed"}
          </h4>
          <p
            className={`text-xs mt-1 ${
              transactionStatus === "pending"
                ? "text-blue-600 dark:text-blue-400"
                : transactionStatus === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {transactionStatus === "pending"
              ? "Your transaction is being processed. This may take a few minutes."
              : transactionStatus === "success" && transactionHash
                ? `Transaction hash: ${transactionHash}`
                : "Your transaction could not be processed. Please try again."}
          </p>
          {transactionStatus === "success" && transactionHash && (
            <Button
              variant="link"
              className="h-auto p-0 text-xs mt-1"
              onClick={() => window.open(`https://etherscan.io/tx/${transactionHash}`, "_blank")}
            >
              View on Explorer
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!wallet) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Blockchain Operations</CardTitle>
          <CardDescription>Perform various operations on the blockchain</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            Connect your wallet to access blockchain operations and manage your digital assets.
          </p>
          <Button onClick={() => setIsWalletDialogOpen(true)}>Connect Wallet</Button>
          <WalletConnectDialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blockchain Operations</CardTitle>
            <CardDescription>Perform operations on {chain?.name || "the blockchain"}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshBalance} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="send">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="swap">Swap</TabsTrigger>
          </TabsList>
          <TabsContent value="send" className="pt-4">
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Enter the full wallet address of the recipient</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="recipient"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  disabled={isLoading || transactionStatus === "pending"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    placeholder="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading || transactionStatus === "pending"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Select
                    value={token}
                    onValueChange={setToken}
                    disabled={isLoading || transactionStatus === "pending"}
                  >
                    <SelectTrigger id="token">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {estimatedGas && (
                <div className="flex items-center justify-between text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                  <span>Estimated gas fee:</span>
                  <span>{estimatedGas} ETH</span>
                </div>
              )}

              {renderTransactionStatus()}

              <Button type="submit" className="w-full" disabled={isLoading || transactionStatus === "pending"}>
                {transactionStatus === "pending" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send {token}
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="swap" className="pt-4">
            <form onSubmit={handleSwap} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="swapAmount">Amount</Label>
                <Input
                  id="swapAmount"
                  placeholder="10"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  disabled={isLoading || transactionStatus === "pending"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromToken">From</Label>
                  <Select
                    value={fromToken}
                    onValueChange={setFromToken}
                    disabled={isLoading || transactionStatus === "pending"}
                  >
                    <SelectTrigger id="fromToken">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toToken">To</Label>
                  <Select
                    value={toToken}
                    onValueChange={setToToken}
                    disabled={isLoading || transactionStatus === "pending"}
                  >
                    <SelectTrigger id="toToken">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {swapAmount && fromToken && toToken && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rate:</span>
                    <span>
                      1 {fromToken} ≈ {fromToken === "ETH" ? "1,950" : "1"} {toToken}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Expected output:</span>
                    <span className="font-medium">
                      {fromToken === "ETH" && toToken === "USDC"
                        ? (Number(swapAmount) * 1950).toFixed(2)
                        : toToken === "ETH" && fromToken === "USDC"
                          ? (Number(swapAmount) / 1950).toFixed(6)
                          : swapAmount}{" "}
                      {toToken}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Fee:</span>
                    <span>0.3%</span>
                  </div>
                </div>
              )}

              {renderTransactionStatus()}

              <Button type="submit" className="w-full" disabled={isLoading || transactionStatus === "pending"}>
                {transactionStatus === "pending" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Swapping...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Swap
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Alert variant="outline" className="w-full">
          <Info className="h-4 w-4" />
          <AlertDescription>
            All transactions are simulated in this demo. No actual blockchain transactions will be executed.
          </AlertDescription>
        </Alert>
      </CardFooter>

      <WalletConnectDialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen} />
    </Card>
  )
}
