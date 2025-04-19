"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { Wallet, AlertCircle, CheckCircle, Copy, ExternalLink } from "lucide-react"

interface WalletConnectProps {
  onConnect?: (address: string) => void
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== "undefined" && typeof window.ethereum !== "undefined"

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Get network name from chain ID
  const getNetworkName = (chainId: string) => {
    const networks: Record<string, string> = {
      "0x1": "Ethereum Mainnet",
      "0x5": "Goerli Testnet",
      "0x89": "Polygon Mainnet",
      "0x13881": "Polygon Mumbai",
      "0xa": "Optimism",
      "0xa4b1": "Arbitrum One",
      "0x2105": "Base",
    }
    return networks[chainId] || `Chain ID: ${chainId}`
  }

  // Handle wallet connection
  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      toast({
        title: "MetaMask not installed",
        description: "Please install MetaMask to connect your wallet.",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const chainId = await window.ethereum.request({ method: "eth_chainId" })

      setAddress(accounts[0])
      setChainId(chainId)

      if (onConnect) {
        onConnect(accounts[0])
      }

      toast({
        title: "Wallet connected",
        description: "Your wallet has been connected successfully.",
      })
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  // Handle wallet disconnection
  const disconnectWallet = () => {
    setAddress(null)
    setChainId(null)
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected.",
    })
  }

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard.",
      })
    }
  }

  // Listen for account and chain changes
  useEffect(() => {
    if (isMetaMaskInstalled) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setAddress(null)
          setChainId(null)
          toast({
            title: "Wallet disconnected",
            description: "Your wallet has been disconnected.",
          })
        } else if (accounts[0] !== address) {
          // User switched accounts
          setAddress(accounts[0])
          if (onConnect) {
            onConnect(accounts[0])
          }
          toast({
            title: "Account changed",
            description: `Switched to account ${formatAddress(accounts[0])}`,
          })
        }
      }

      const handleChainChanged = (chainId: string) => {
        setChainId(chainId)
        toast({
          title: "Network changed",
          description: `Switched to ${getNetworkName(chainId)}`,
        })
        // Reload the page to avoid any issues
        window.location.reload()
      }

      // Check if already connected
      const checkConnection = async () => {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: "eth_chainId" })
            setAddress(accounts[0])
            setChainId(chainId)
            if (onConnect) {
              onConnect(accounts[0])
            }
          }
        } catch (error) {
          console.error("Error checking connection:", error)
        }
      }

      checkConnection()

      // Set up event listeners
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      // Clean up event listeners
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [address, onConnect, toast, isMetaMaskInstalled])

  if (!address) {
    return (
      <Card className="w-full max-w-md mx-auto animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-primary" />
            Connect Wallet
          </CardTitle>
          <CardDescription>Connect your wallet to use blockchain features</CardDescription>
        </CardHeader>
        <CardContent>
          {!isMetaMaskInstalled ? (
            <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
              <p className="text-center text-sm text-muted-foreground mb-2">
                MetaMask is not installed. Please install MetaMask to connect your wallet.
              </p>
              <Button
                variant="outline"
                onClick={() => window.open("https://metamask.io/download/", "_blank")}
                className="mt-2"
              >
                Install MetaMask
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg">
              <img
                src="/metamask-fox.svg"
                alt="MetaMask"
                className="h-16 w-16 mb-4"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg"
                }}
              />
              <p className="text-center text-sm text-muted-foreground mb-4">
                Connect with MetaMask to access blockchain features and execute transactions.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={connectWallet} disabled={!isMetaMaskInstalled || isConnecting} className="w-full">
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <span className="connection-dot connected" />
            Wallet Connected
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={disconnectWallet}>
            Disconnect
          </Button>
        </div>
        <CardDescription>Connected to {getNetworkName(chainId || "0x1")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium">{formatAddress(address)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={copyAddress} className="h-8 w-8">
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy address</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`https://etherscan.io/address/${address}`, "_blank")}
                      className="h-8 w-8"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on Etherscan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
