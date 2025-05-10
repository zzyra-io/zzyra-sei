"use client"
import { useState } from "react"
import { useAccount } from "wagmi"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { WalletConnectDialog } from "@/components/web3/wallet-connect-dialog"
import { TokenBalanceCard } from "@/components/web3/token-balance-card"
import { TokenTransferCard } from "@/components/web3/token-transfer-card"
import { FadeIn } from "@/components/animations/fade-in"
import { StaggerList } from "@/components/animations/stagger-list"
import { InteractiveButton } from "@/components/animations/interactive-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTransactionHistory } from "@/hooks/use-transaction-history"
import { Wallet, Coins, ArrowRightLeft, History } from "lucide-react"

export default function BlockchainPageClient() {
  const { isConnected, address } = useAccount()
  const [selectedToken, setSelectedToken] = useState("ETH")
  const { data: transactions, isLoading: isLoadingTransactions } = useTransactionHistory()

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Blockchain Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Manage your blockchain assets and transactions</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Wallet Connection Card */}
              <div className="md:col-span-2 lg:col-span-3">{!isConnected && <WalletConnectDialog />}</div>

              {isConnected && (
                <>
                  {/* Token Selection */}
                  <FadeIn>
                    <div className="md:col-span-2 lg:col-span-3">
                      <Card>
                        <CardHeader>
                          <CardTitle>Select Token</CardTitle>
                          <CardDescription>Choose a token to view and manage</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {["ETH", "USDC", "DAI", "WETH"].map((token) => (
                              <InteractiveButton
                                key={token}
                                variant={selectedToken === token ? "default" : "outline"}
                                onClick={() => setSelectedToken(token)}
                                className="flex items-center gap-2"
                                scaleOnHover
                                scaleOnTap
                              >
                                <Coins className="h-4 w-4" />
                                {token}
                              </InteractiveButton>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </FadeIn>

                  {/* Token Balance */}
                  <TokenBalanceCard tokenSymbol={selectedToken} />

                  {/* Token Transfer */}
                  <TokenTransferCard tokenSymbol={selectedToken} />

                  {/* Transaction History */}
                  <Card className="md:col-span-2 lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <History className="mr-2 h-5 w-5" />
                        Recent Transactions
                      </CardTitle>
                      <CardDescription>Your recent token transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingTransactions ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center p-2 border rounded-md">
                              <div className="w-10 h-10 bg-muted/50 rounded-full animate-pulse" />
                              <div className="ml-3 space-y-1 flex-1">
                                <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : transactions?.length ? (
                        <StaggerList className="space-y-2">
                          {transactions.slice(0, 5).map((tx) => (
                            <div key={tx.hash} className="flex items-center p-2 border rounded-md">
                              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
                                {tx.from.toLowerCase() === (isConnected ? address?.toLowerCase() : "") ? (
                                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                                ) : (
                                  <ArrowRightLeft className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium">
                                  {tx.from.toLowerCase() === (isConnected ? address?.toLowerCase() : "")
                                    ? "Sent"
                                    : "Received"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(tx.timestamp * 1000).toLocaleString()}
                                </p>
                              </div>
                              <div className="ml-auto text-right">
                                <p className="text-sm font-medium">{tx.value} ETH</p>
                              </div>
                            </div>
                          ))}
                        </StaggerList>
                      ) : (
                        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                          No recent transactions found
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Blockchain Tools */}
              <div className="md:col-span-2 lg:col-span-3">
                <Tabs defaultValue="tokens" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tokens">Tokens</TabsTrigger>
                    <TabsTrigger value="nfts">NFTs</TabsTrigger>
                    <TabsTrigger value="defi">DeFi</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tokens" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Token Management</CardTitle>
                        <CardDescription>Manage your ERC-20 tokens across different networks</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Token Swap</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Swap between different tokens at the best rates
                            </p>
                            <Button className="mt-4 w-full" variant="outline" disabled={!isConnected}>
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Swap Tokens
                            </Button>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Token Approval</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">Manage token approvals and allowances</p>
                            <Button className="mt-4 w-full" variant="outline" disabled={!isConnected}>
                              Manage Approvals
                            </Button>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Add Custom Token</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">Add and track custom ERC-20 tokens</p>
                            <Button className="mt-4 w-full" variant="outline" disabled={!isConnected}>
                              Add Token
                            </Button>
                          </CardContent>
                        </Card>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="nfts" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>NFT Gallery</CardTitle>
                        <CardDescription>View and manage your NFT collection</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                          <Wallet className="h-10 w-10 text-muted-foreground/80" />
                          <h3 className="mt-4 text-lg font-semibold">No NFTs Found</h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {isConnected
                              ? "You don't have any NFTs in your connected wallet."
                              : "Connect your wallet to view your NFT collection."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="defi" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>DeFi Dashboard</CardTitle>
                        <CardDescription>Manage your DeFi positions and investments</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                          <Coins className="h-10 w-10 text-muted-foreground/80" />
                          <h3 className="mt-4 text-lg font-semibold">DeFi Coming Soon</h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            We're working on integrating DeFi features. Check back soon!
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
