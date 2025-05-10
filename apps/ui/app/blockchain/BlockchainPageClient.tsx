"use client"

import { useState } from "react"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { BlockchainOperations } from "@/components/finance/blockchain-operations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWeb3 } from "@/components/web3/web3-provider"
import { WalletConnectDialog } from "@/components/web3/wallet-connect-dialog"
import {
  Wallet,
  ArrowUpDown,
  History,
  BarChart3,
  Coins,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function BlockchainPageClient() {
  const { wallet, chain } = useWeb3()
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false)

  // Mock transaction history
  const transactions = [
    {
      id: "tx1",
      type: "send",
      amount: "0.5 ETH",
      to: "0x1234...5678",
      date: "2023-06-15T10:30:00Z",
      status: "completed",
      hash: "0xabcd...1234",
    },
    {
      id: "tx2",
      type: "receive",
      amount: "1000 USDC",
      from: "0x8765...4321",
      date: "2023-06-14T14:20:00Z",
      status: "completed",
      hash: "0xefgh...5678",
    },
    {
      id: "tx3",
      type: "swap",
      amount: "2 ETH → 3,900 USDC",
      date: "2023-06-12T09:15:00Z",
      status: "failed",
      hash: "0xijkl...9012",
    },
  ]

  // Mock portfolio data
  const portfolio = [
    { token: "ETH", balance: "3.5", value: "$6,825", change: "+2.3%" },
    { token: "USDC", balance: "5,000", value: "$5,000", change: "0%" },
    { token: "LINK", balance: "150", value: "$1,875", change: "-1.2%" },
    { token: "UNI", balance: "75", value: "$450", change: "+5.7%" },
  ]

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Blockchain Dashboard</h1>
                <p className="text-muted-foreground">Manage your blockchain assets and operations</p>
              </div>
              <div className="flex items-center gap-2">
                {wallet ? (
                  <Button variant="outline" onClick={() => setIsWalletDialogOpen(true)}>
                    <Wallet className="mr-2 h-4 w-4" />
                    {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
                    <Badge
                      variant="outline"
                      className="ml-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                    >
                      {chain?.name || "Connected"}
                    </Badge>
                  </Button>
                ) : (
                  <Button onClick={() => setIsWalletDialogOpen(true)}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{wallet ? "$14,150" : "—"}</div>
                  <p className="text-xs text-green-600 mt-1">
                    {wallet ? "+$320 (2.3%) today" : "Connect wallet to view"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">ETH Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$1,950</div>
                  <p className="text-xs text-green-600 mt-1">+$42 (2.2%) today</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gas Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">15 Gwei</div>
                  <p className="text-xs text-muted-foreground mt-1">Standard transaction</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Network Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                    <div className="text-lg font-medium">Operational</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">All systems normal</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="operations" className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="operations">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Operations
                </TabsTrigger>
                <TabsTrigger value="portfolio">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Portfolio
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="mr-2 h-4 w-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="operations">
                <div className="grid gap-6 md:grid-cols-2">
                  <BlockchainOperations />

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common blockchain operations</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center">
                          <Coins className="h-6 w-6 mb-2" />
                          <span>Buy Crypto</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center">
                          <ArrowUpDown className="h-6 w-6 mb-2" />
                          <span>Swap Tokens</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center">
                          <Shield className="h-6 w-6 mb-2" />
                          <span>Security Check</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center">
                          <History className="h-6 w-6 mb-2" />
                          <span>View History</span>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Network Status</CardTitle>
                        <CardDescription>Current blockchain network conditions</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Ethereum:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
                            Operational
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Polygon:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
                            Operational
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Arbitrum:</span>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                            <div className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></div>
                            Congested
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Optimism:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
                            Operational
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="portfolio">
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Portfolio</CardTitle>
                    <CardDescription>Your current blockchain assets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {wallet ? (
                      <div className="space-y-4">
                        <div className="rounded-md border">
                          <div className="grid grid-cols-5 gap-4 p-4 font-medium text-sm border-b">
                            <div>Token</div>
                            <div>Balance</div>
                            <div>Value</div>
                            <div>24h Change</div>
                            <div className="text-right">Actions</div>
                          </div>
                          <div className="divide-y">
                            {portfolio.map((asset) => (
                              <div key={asset.token} className="grid grid-cols-5 gap-4 p-4 items-center">
                                <div className="font-medium">{asset.token}</div>
                                <div>{asset.balance}</div>
                                <div>{asset.value}</div>
                                <div
                                  className={
                                    asset.change.startsWith("+")
                                      ? "text-green-600"
                                      : asset.change.startsWith("-")
                                        ? "text-red-600"
                                        : ""
                                  }
                                >
                                  {asset.change}
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm">
                                    Send
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    Swap
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm">
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            Manage Assets
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                        <Wallet className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
                        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                          Connect your wallet to view your portfolio.
                        </p>
                        <Button onClick={() => setIsWalletDialogOpen(true)}>Connect Wallet</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Recent blockchain transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {wallet ? (
                      <div className="space-y-4">
                        <div className="rounded-md border">
                          <div className="grid grid-cols-5 gap-4 p-4 font-medium text-sm border-b">
                            <div>Type</div>
                            <div>Amount</div>
                            <div>Date</div>
                            <div>Status</div>
                            <div className="text-right">Actions</div>
                          </div>
                          <div className="divide-y">
                            {transactions.map((tx) => (
                              <div key={tx.id} className="grid grid-cols-5 gap-4 p-4 items-center">
                                <div className="font-medium capitalize">{tx.type}</div>
                                <div>{tx.amount}</div>
                                <div>{new Date(tx.date).toLocaleDateString()}</div>
                                <div>
                                  {tx.status === "completed" ? (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Completed
                                    </Badge>
                                  ) : tx.status === "pending" ? (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Pending
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                      <XCircle className="mr-1 h-3 w-3" />
                                      Failed
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex justify-end">
                                  <Button variant="link" size="sm" className="h-auto p-0">
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm">
                            <History className="mr-2 h-4 w-4" />
                            View All Transactions
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                        <History className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Transaction History</h3>
                        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                          Connect your wallet to view your transaction history.
                        </p>
                        <Button onClick={() => setIsWalletDialogOpen(true)}>Connect Wallet</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Center</CardTitle>
                    <CardDescription>Manage your wallet security settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {wallet ? (
                      <div className="space-y-6">
                        <div className="rounded-md border p-4">
                          <div className="flex items-start">
                            <Shield className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                            <div>
                              <h3 className="font-medium">Security Status: Good</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Your wallet security settings are properly configured.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-medium">Security Recommendations</h3>
                          <div className="rounded-md border p-4 flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                            <div>
                              <h4 className="font-medium">Use a hardware wallet</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Hardware wallets provide the highest level of security for your crypto assets.
                              </p>
                            </div>
                          </div>
                          <div className="rounded-md border p-4 flex items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
                            <div>
                              <h4 className="font-medium">Enable transaction notifications</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Get notified whenever a transaction is made from your wallet.
                              </p>
                              <Button variant="outline" size="sm" className="mt-2">
                                Enable Notifications
                              </Button>
                            </div>
                          </div>
                          <div className="rounded-md border p-4 flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                            <div>
                              <h4 className="font-medium">Backup your recovery phrase</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Store your recovery phrase in a secure location.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button variant="outline">
                            <Shield className="mr-2 h-4 w-4" />
                            Security Checkup
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                        <Shield className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
                        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                          Connect your wallet to access security features.
                        </p>
                        <Button onClick={() => setIsWalletDialogOpen(true)}>Connect Wallet</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <WalletConnectDialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen} />
    </AuthGate>
  )
}
