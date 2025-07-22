"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  ExternalLink,
  Zap,
  Database,
  Wallet,
  Globe,
  BarChart3,
  LineChart,
  PieChart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChainData {
  chainId: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  status: 'connected' | 'disconnected' | 'error';
  blockHeight: number;
  gasPrice: string;
  lastUpdate: string;
}

interface PriceData {
  asset: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdate: string;
}

interface TransactionMonitor {
  id: string;
  hash: string;
  chainId: string;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  blockNumber?: number;
  confirmations: number;
}

interface BlockchainEvent {
  id: string;
  chainId: string;
  contractAddress: string;
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
  data: Record<string, any>;
  processed: boolean;
}

interface BlockchainMonitoringDashboardProps {
  workflowId?: string;
  enableRealTimeUpdates?: boolean;
  onEventTrigger?: (event: BlockchainEvent) => void;
  onTransactionUpdate?: (transaction: TransactionMonitor) => void;
}

export function BlockchainMonitoringDashboard({
  workflowId,
  enableRealTimeUpdates = true,
  onEventTrigger,
  onTransactionUpdate,
}: BlockchainMonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Mock data - in real implementation, these would come from APIs/WebSocket connections
  const [chainData, setChainData] = useState<ChainData[]>([
    {
      chainId: "1",
      name: "Ethereum Mainnet",
      symbol: "ETH",
      rpcUrl: "https://mainnet.infura.io/v3/...",
      explorerUrl: "https://etherscan.io",
      status: "connected",
      blockHeight: 18500000,
      gasPrice: "15.2 gwei",
      lastUpdate: new Date().toISOString(),
    },
    {
      chainId: "137",
      name: "Polygon",
      symbol: "MATIC",
      rpcUrl: "https://polygon-mainnet.infura.io/v3/...",
      explorerUrl: "https://polygonscan.com",
      status: "connected",
      blockHeight: 48000000,
      gasPrice: "30.5 gwei",
      lastUpdate: new Date().toISOString(),
    },
    {
      chainId: "56",
      name: "BSC",
      symbol: "BNB",
      rpcUrl: "https://bsc-dataseed.binance.org/",
      explorerUrl: "https://bscscan.com",
      status: "connected",
      blockHeight: 32000000,
      gasPrice: "5.0 gwei",
      lastUpdate: new Date().toISOString(),
    },
  ]);

  const [priceData, setPriceData] = useState<PriceData[]>([
    {
      asset: "ethereum",
      symbol: "ETH",
      currentPrice: 2340.50,
      priceChange24h: 2.45,
      volume24h: 15000000000,
      marketCap: 280000000000,
      lastUpdate: new Date().toISOString(),
    },
    {
      asset: "polygon",
      symbol: "MATIC",
      currentPrice: 0.85,
      priceChange24h: -1.23,
      volume24h: 500000000,
      marketCap: 8000000000,
      lastUpdate: new Date().toISOString(),
    },
    {
      asset: "binancecoin",
      symbol: "BNB",
      currentPrice: 285.30,
      priceChange24h: 0.87,
      volume24h: 800000000,
      marketCap: 42000000000,
      lastUpdate: new Date().toISOString(),
    },
  ]);

  const [transactionMonitors, setTransactionMonitors] = useState<TransactionMonitor[]>([
    {
      id: "tx-1",
      hash: "0xabc123...def456",
      chainId: "1",
      from: "0x123...abc",
      to: "0x456...def",
      value: "1.5 ETH",
      gasUsed: 21000,
      gasPrice: "15 gwei",
      status: "confirmed",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      blockNumber: 18500001,
      confirmations: 12,
    },
    {
      id: "tx-2",
      hash: "0xdef456...abc789",
      chainId: "137",
      from: "0x789...ghi",
      to: "0xabc...123",
      value: "100 MATIC",
      gasUsed: 50000,
      gasPrice: "30 gwei",
      status: "pending",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      confirmations: 0,
    },
  ]);

  const [blockchainEvents, setBlockchainEvents] = useState<BlockchainEvent[]>([
    {
      id: "event-1",
      chainId: "1",
      contractAddress: "0xA0b86a33E6441e8DE2f3DAbE96EbC86f8E0C40cE",
      eventName: "Transfer",
      blockNumber: 18500000,
      transactionHash: "0xabc123...def456",
      timestamp: new Date(Date.now() - 180000).toISOString(),
      data: {
        from: "0x123...abc",
        to: "0x456...def",
        amount: "1000000000000000000",
      },
      processed: true,
    },
    {
      id: "event-2",
      chainId: "137",
      contractAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      eventName: "Approval",
      blockNumber: 48000001,
      transactionHash: "0xdef456...ghi789",
      timestamp: new Date(Date.now() - 120000).toISOString(),
      data: {
        owner: "0x789...ghi",
        spender: "0xabc...123",
        value: "1000000000",
      },
      processed: false,
    },
  ]);

  // Real-time updates simulation
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const interval = setInterval(() => {
      // Update chain data
      setChainData(prev => prev.map(chain => ({
        ...chain,
        blockHeight: chain.blockHeight + Math.floor(Math.random() * 3),
        lastUpdate: new Date().toISOString(),
      })));

      // Update price data
      setPriceData(prev => prev.map(price => {
        const changePercent = (Math.random() - 0.5) * 0.02; // ±1% change
        return {
          ...price,
          currentPrice: price.currentPrice * (1 + changePercent),
          priceChange24h: price.priceChange24h + changePercent * 100,
          lastUpdate: new Date().toISOString(),
        };
      }));

      // Update transaction confirmations
      setTransactionMonitors(prev => prev.map(tx => ({
        ...tx,
        confirmations: tx.status === 'pending' 
          ? Math.min(tx.confirmations + Math.floor(Math.random() * 2), 12)
          : tx.confirmations,
        status: tx.status === 'pending' && tx.confirmations >= 12 ? 'confirmed' : tx.status,
      })));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [enableRealTimeUpdates]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />;
      case 'disconnected':
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatValue = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const connectedChains = chainData.filter(chain => chain.status === 'connected').length;
  const totalVolume = priceData.reduce((sum, data) => sum + data.volume24h, 0);
  const pendingTransactions = transactionMonitors.filter(tx => tx.status === 'pending').length;
  const unprocessedEvents = blockchainEvents.filter(event => !event.processed).length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Blockchain Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of blockchain networks, transactions, and events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Connected Chains</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{connectedChains}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ {chainData.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total 24h Volume</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">${formatValue(totalVolume)}</span>
                  <TrendingUp className="w-4 h-4 text-green-600 ml-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Transactions</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{pendingTransactions}</span>
                  {pendingTransactions > 0 && (
                    <Activity className="w-4 h-4 text-yellow-600 ml-2 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Unprocessed Events</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{unprocessedEvents}</span>
                  {unprocessedEvents > 0 && (
                    <AlertTriangle className="w-4 h-4 text-orange-600 ml-2" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="chains" className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Chains</span>
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center space-x-2">
            <LineChart className="w-4 h-4" />
            <span className="hidden sm:inline">Prices</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center space-x-2">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chain Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Chain Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chainData.map((chain) => (
                    <div key={chain.chainId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(chain.status)}
                        <div>
                          <p className="font-medium">{chain.name}</p>
                          <p className="text-xs text-muted-foreground">Block: {chain.blockHeight.toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant={chain.status === 'connected' ? 'default' : 'destructive'}>
                        {chain.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {[...transactionMonitors.slice(0, 3), ...blockchainEvents.slice(0, 2)].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 border-l-2 border-l-blue-500 bg-blue-50 rounded">
                        {'hash' in item ? (
                          <>
                            <Wallet className="w-4 h-4 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Transaction {item.status}</p>
                              <p className="text-xs text-muted-foreground">{item.hash}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Event: {item.eventName}</p>
                              <p className="text-xs text-muted-foreground">Block {item.blockNumber}</p>
                            </div>
                          </>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {new Date('timestamp' in item ? item.timestamp : item.timestamp).toLocaleTimeString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Networks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Block Height</TableHead>
                    <TableHead>Gas Price</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chainData.map((chain) => (
                    <TableRow key={chain.chainId}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">
                              {chain.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{chain.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {chain.chainId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(chain.status)}
                          <Badge variant={chain.status === 'connected' ? 'default' : 'destructive'}>
                            {chain.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{chain.blockHeight.toLocaleString()}</TableCell>
                      <TableCell>{chain.gasPrice}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {new Date(chain.lastUpdate).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="ml-2">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Explorer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {priceData.map((asset) => (
                  <motion.div
                    key={asset.asset}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {asset.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium">{asset.symbol}</span>
                      </div>
                      <Badge variant={asset.priceChange24h >= 0 ? 'default' : 'destructive'}>
                        {asset.priceChange24h >= 0 ? '+' : ''}{asset.priceChange24h.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-bold">{formatPrice(asset.currentPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Market Cap</span>
                        <span className="text-sm">${formatValue(asset.marketCap)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Volume 24h</span>
                        <span className="text-sm">${formatValue(asset.volume24h)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmations</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionMonitors.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm">{tx.hash}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.from} → {tx.to}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {chainData.find(c => c.chainId === tx.chainId)?.name || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.value}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tx.status)}
                          <Badge variant={
                            tx.status === 'confirmed' ? 'default' :
                            tx.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {tx.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={tx.confirmations >= 12 ? 'text-green-600' : 'text-yellow-600'}>
                          {tx.confirmations}/12
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockchainEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.eventName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {event.transactionHash}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{event.contractAddress}</span>
                      </TableCell>
                      <TableCell>{event.blockNumber.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={event.processed ? 'default' : 'secondary'}>
                          {event.processed ? 'Processed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Data
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}