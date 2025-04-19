"use client"

import { useState } from "react"
import { useWeb3 } from "@/components/web3/web3-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WalletConnectDialog } from "@/components/web3/wallet-connect-dialog"
import { Wallet, LogOut, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function WalletConnect() {
  const { wallet, chain, disconnectWallet, supportedChains, switchChain } = useWeb3()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Wallet Connection</CardTitle>
          <CardDescription>Connect your wallet to interact with blockchain features</CardDescription>
        </CardHeader>
        <CardContent>
          {wallet ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="font-mono">{wallet.address}</span>
                </div>
                <Badge variant="outline">{chain?.name || "Unknown Chain"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-medium">{wallet.balance} ETH</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground mb-4">
                Connect your wallet to access blockchain features and manage your assets
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            </div>
          )}
        </CardContent>
        {wallet && (
          <CardFooter className="flex justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {chain?.name}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Switch Network</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {supportedChains.map((supportedChain) => (
                  <DropdownMenuItem
                    key={supportedChain.id}
                    onClick={() => switchChain(supportedChain.id)}
                    disabled={chain?.id === supportedChain.id}
                  >
                    {supportedChain.name}
                    {chain?.id === supportedChain.id && " (Current)"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="destructive" size="sm" onClick={disconnectWallet}>
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </CardFooter>
        )}
      </Card>
      <WalletConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
