"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWeb3 } from "./web3-provider"
import { Loader2, AlertCircle, CheckCircle, ExternalLink, Copy, ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

type WalletOption = {
  id: string
  name: string
  icon: string
  description: string
  popular?: boolean
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "/metamask-fox.svg",
    description: "The most popular Ethereum wallet",
    popular: true,
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    icon: "/walletconnect-logo.png",
    description: "Connect to mobile wallets",
    popular: true,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "/abstract-coinbase-wallet.png",
    description: "Use Coinbase's secure wallet",
    popular: true,
  },
  {
    id: "trust",
    name: "Trust Wallet",
    icon: "/trust-wallet-logo-display.png",
    description: "Multi-chain mobile wallet",
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: "/phantom-icon-purple.png",
    description: "Solana's top wallet",
  },
  {
    id: "brave",
    name: "Brave Wallet",
    icon: "/brave-logo.png",
    description: "Built into Brave browser",
  },
]

interface WalletConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletConnectDialog({ open, onOpenChange }: WalletConnectDialogProps) {
  const {
    connectWallet,
    disconnectWallet,
    isLoading,
    walletConnectProjectId,
    wallet,
    chain,
    supportedChains,
    switchChain,
  } = useWeb3()
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string>("popular")

  // Reset selected wallet when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedWallet(null)
    }
  }, [open])

  const handleConnect = async (walletId: string) => {
    setSelectedWallet(walletId)
    try {
      await connectWallet()
      toast({
        title: "Wallet connected",
        description: "Your wallet has been connected successfully.",
      })
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
      setSelectedWallet(null)
    }
  }

  const handleDisconnect = async () => {
    try {
      disconnectWallet()
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected.",
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Disconnection failed",
        description: "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSwitchChain = async (chainId: number) => {
    try {
      await switchChain(chainId)
      toast({
        title: "Network switched",
        description: `Switched to ${supportedChains.find((c) => c.id === chainId)?.name || "new network"}.`,
      })
    } catch (error) {
      toast({
        title: "Network switch failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      })
    }
  }

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard.",
      })
    }
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const popularWallets = WALLET_OPTIONS.filter((wallet) => wallet.popular)
  const otherWallets = WALLET_OPTIONS.filter((wallet) => !wallet.popular)

  if (wallet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Connected</DialogTitle>
            <DialogDescription>Your wallet is connected to {chain?.name || "the blockchain"}</DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="font-medium">{formatAddress(wallet.address)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={copyAddress} className="h-8 w-8">
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(`https://etherscan.io/address/${wallet.address}`, "_blank")}
                    className="h-8 w-8"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-medium">{wallet.balance} ETH</span>
              </div>
              {chain && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Network</span>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">{chain.name}</span>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2">
              <div className="w-full">
                <div className="text-sm font-medium mb-2">Available Networks</div>
                <div className="flex flex-wrap gap-2">
                  {supportedChains.map((supportedChain) => (
                    <Badge
                      key={supportedChain.id}
                      variant={chain?.id === supportedChain.id ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleSwitchChain(supportedChain.id)}
                    >
                      {supportedChain.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="destructive" onClick={handleDisconnect} className="w-full">
                Disconnect Wallet
              </Button>
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>Connect your wallet to interact with blockchain features</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="popular" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="more">More Options</TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="mt-4 space-y-3">
            {popularWallets.map((wallet) => (
              <motion.div key={wallet.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left h-auto p-4"
                  disabled={isLoading}
                  onClick={() => handleConnect(wallet.id)}
                >
                  <div className="flex items-center">
                    <img
                      src={wallet.icon || "/placeholder.svg"}
                      alt={wallet.name}
                      className="mr-3 h-8 w-8"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?key=wyqn2"
                      }}
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-xs text-muted-foreground">{wallet.description}</span>
                    </div>
                  </div>
                  {isLoading && selectedWallet === wallet.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="more" className="mt-4 space-y-3">
            {otherWallets.map((wallet) => (
              <motion.div key={wallet.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left h-auto p-4"
                  disabled={isLoading}
                  onClick={() => handleConnect(wallet.id)}
                >
                  <div className="flex items-center">
                    <img
                      src={wallet.icon || "/placeholder.svg"}
                      alt={wallet.name}
                      className="mr-3 h-8 w-8"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?key=q46kr"
                      }}
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-xs text-muted-foreground">{wallet.description}</span>
                    </div>
                  </div>
                  {isLoading && selectedWallet === wallet.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>

        {!walletConnectProjectId && (
          <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-md dark:border-amber-900/50 dark:bg-amber-900/20">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400">WalletConnect Not Configured</h4>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                  WalletConnect Project ID is not configured. Some wallet connections may not work properly.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
