"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { useUserWallets } from "@/hooks/useUserWallets";
import { useWalletIntegration } from "@/hooks/useWalletIntegration";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  History as HistoryIcon,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

// Helper function to get chain symbol
const getChainSymbol = (chainId: number | string): string => {
  const chainIdNum = typeof chainId === "string" ? parseInt(chainId) : chainId;

  switch (chainIdNum) {
    case 1: // Ethereum Mainnet
      return "ETH";
    case 137: // Polygon
      return "MATIC";
    case 56: // BSC
      return "BNB";
    case 42161: // Arbitrum
      return "ETH";
    case 10: // Optimism
      return "ETH";
    case 43114: // Avalanche
      return "AVAX";
    default:
      return "ETH";
  }
};

// Helper function to format date (unused but kept for future use)
// const formatDate = (dateString: string): string => {
//   if (!dateString) return "Unknown";

//   const date = new Date(dateString);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffSec = Math.floor(diffMs / 1000);
//   const diffMin = Math.floor(diffSec / 60);
//   const diffHour = Math.floor(diffMin / 60);
//   const diffDay = Math.floor(diffHour / 24);

//   if (diffSec < 60) return "just now";
//   if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
//   if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
//   if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;

//   return date.toLocaleDateString();
// };

// Transaction type for UI display
type TransactionType = "send" | "receive" | "swap" | "contract" | "unknown";

// Transaction interface
interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  symbol: string;
  time: string;
  status: string;
  hash: string;
  to: string;
  from: string;
}

export default function WalletInfoProfile() {
  const [activeTab, setActiveTab] = useState("overview");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { toast } = useToast();

  // Use wallet integration hook
  const walletIntegration = useWalletIntegration();
  const {
    address,
    isConnected,
    chain,
    connect,
    connectors,
    isConnecting,
    disconnect,
    isDisconnecting,
    connectWithMagic,
    selectedNetwork,
    switchNetwork,
    getNetworkById,
    supportedNetworks,
    formatAddress,
    copyAddress,
    copiedAddress,
  } = walletIntegration;

  // Get user wallets
  const {
    wallets,
    isLoading: isLoadingWallets,
    refetch,
    deleteWallet,
  } = useUserWallets();

  // Debug logging
  console.log("WalletInfoProfile - Current state:", {
    wallets,
    isLoadingWallets,
    walletCount: wallets?.length || 0,
    isConnected,
    address,
  });

  // Add effect to listen for wallet connections and address changes
  useEffect(() => {
    console.log("WalletInfoProfile - Current wallet address:", address);

    // Function to handle wallet connection event
    const handleWalletConnected = () => {
      console.log(
        "WalletInfoProfile - Wallet connected event received, refreshing wallets list"
      );
      setRefreshTrigger((prev) => prev + 1);
      refetch();
    };

    // Listen for the custom wallet connection event
    window.addEventListener("wallet-connected", handleWalletConnected);

    // When wallet address changes, also refresh the list
    if (address && isConnected) {
      console.log("WalletInfoProfile - Address changed, refreshing wallets");
      refetch();
    }

    // Clean up event listener
    return () => {
      window.removeEventListener("wallet-connected", handleWalletConnected);
    };
  }, [address, isConnected, refetch, refreshTrigger]);

  // Use wallet transactions hook
  const {
    transactions: _rawTransactions, // Prefix with _ to indicate unused
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
  } = useWalletTransactions(address);

  // Format transactions for display - TODO: Fix transaction types
  const transactions: Transaction[] = [];

  // Handle wallet connection
  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector });
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      });
    } catch {
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      });
    } catch {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle wallet deletion
  const handleDeleteWallet = async (walletId: string) => {
    try {
      await deleteWallet.mutate(walletId);
      toast({
        title: "Wallet Removed",
        description: "The wallet has been removed from your account.",
      });
    } catch {
      toast({
        title: "Removal Failed",
        description: "Failed to remove wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle network switching
  const handleNetworkSwitch = async (networkId: number) => {
    try {
      await switchNetwork(networkId);
      toast({
        title: "Network Switched",
        description: `Switched to ${
          getNetworkById(networkId)?.name || "new network"
        }.`,
      });
    } catch {
      toast({
        title: "Network Switch Failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className='space-y-6'>
      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='wallets'>Wallets</TabsTrigger>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value='overview' className='space-y-6'>
          <Card className='bg-white/50 dark:bg-slate-900/50 border-0 shadow-lg'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-xl flex items-center justify-between'>
                <span>Wallet Balance</span>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setBalanceVisible(!balanceVisible)}>
                  {balanceVisible ? (
                    <Eye className='h-4 w-4' />
                  ) : (
                    <EyeOff className='h-4 w-4' />
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Your connected wallet and balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWallets ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : wallets && wallets.length > 0 ? (
                <div className='space-y-4'>
                  {wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg'>
                      <div className='flex items-center gap-3'>
                        <div className='bg-primary/10 p-2 rounded-full'>
                          <Wallet className='h-5 w-5 text-primary' />
                        </div>
                        <div>
                          <div className='font-medium text-slate-800 dark:text-slate-200'>
                            {(wallet.walletType ||
                              getChainSymbol(wallet.chainId)) + " Wallet"}
                          </div>
                          <div className='text-sm text-slate-500 dark:text-slate-400'>
                            {wallet.walletAddress
                              ? formatAddress(wallet.walletAddress)
                              : "Unknown"}
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='text-right'>
                          <div className='font-medium text-slate-800 dark:text-slate-200'>
                            {balanceVisible ? "Loading..." : "••••••"}
                          </div>
                          <Badge
                            variant='outline'
                            className='bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'>
                            {wallet.chainId
                              ? getNetworkById(Number(wallet.chainId))?.name ||
                                "Unknown Network"
                              : "Unknown Network"}
                          </Badge>
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 px-2'
                          onClick={() => handleDeleteWallet(wallet.id)}>
                          <Trash2 className='h-3.5 w-3.5 mr-1' />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-6'>
                  <div className='bg-primary/10 p-3 rounded-full inline-block mb-3'>
                    <Wallet className='h-6 w-6 text-primary' />
                  </div>
                  <h3 className='text-lg font-medium mb-1'>
                    No Wallets Connected
                  </h3>
                  <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
                    Connect a wallet to view your balance and transactions
                  </p>
                  <Button onClick={() => setActiveTab("wallets")}>
                    <Plus className='h-4 w-4 mr-2' />
                    Connect Wallet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='bg-white/50 dark:bg-slate-900/50 border-0 shadow-lg'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-xl flex items-center justify-between'>
                <span>Recent Transactions</span>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => refetchTransactions()}>
                  <RefreshCw className='h-4 w-4' />
                </Button>
              </CardTitle>
              <CardDescription>Your recent wallet activity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : transactions && transactions.length > 0 ? (
                <ScrollArea className='h-[300px]'>
                  <div className='space-y-3'>
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={`p-2 rounded-full ${
                              tx.type === "receive"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : tx.type === "send"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                            {tx.type === "receive" ? (
                              <ArrowDownLeft className='h-4 w-4' />
                            ) : tx.type === "send" ? (
                              <ArrowUpRight className='h-4 w-4' />
                            ) : (
                              <RefreshCw className='h-4 w-4' />
                            )}
                          </div>
                          <div>
                            <div className='font-medium text-slate-800 dark:text-slate-200'>
                              {tx.type === "receive"
                                ? "Received"
                                : tx.type === "send"
                                  ? "Sent"
                                  : tx.type === "swap"
                                    ? "Swapped"
                                    : "Contract Interaction"}
                            </div>
                            <div className='text-sm text-slate-500 dark:text-slate-400'>
                              {tx.amount} {tx.symbol}
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className='text-right'>
                            <div className='text-sm text-slate-600 dark:text-slate-400'>
                              {tx.time}
                            </div>
                            <Badge
                              variant='secondary'
                              className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>
                              {tx.status}
                            </Badge>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-8 w-8 p-0'
                                  asChild>
                                  <a
                                    href={`https://etherscan.io/tx/${tx.hash}`}
                                    target='_blank'
                                    rel='noopener noreferrer'>
                                    <ExternalLink className='h-4 w-4' />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View on Explorer</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className='text-center py-6'>
                  <div className='bg-primary/10 p-3 rounded-full inline-block mb-3'>
                    <HistoryIcon className='h-6 w-6 text-primary' />
                  </div>
                  <h3 className='text-lg font-medium mb-1'>No Transactions</h3>
                  <p className='text-sm text-slate-500 dark:text-slate-400'>
                    Your transactions will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value='wallets' className='space-y-6'>
          <Card className='bg-white/50 dark:bg-slate-900/50 border-0 shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Wallet className='h-5 w-5' />
                Connected Wallets
              </CardTitle>
              <CardDescription>Manage your connected wallets</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {isLoadingWallets ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : wallets && wallets.length > 0 ? (
                <div className='space-y-4'>
                  {wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg'>
                      <div className='flex items-center gap-3'>
                        <div className='bg-primary/10 p-2 rounded-full'>
                          <Wallet className='h-5 w-5 text-primary' />
                        </div>
                        <div>
                          <div className='font-medium text-slate-800 dark:text-slate-200'>
                            {(wallet.walletType ||
                              getChainSymbol(wallet.chainId)) + " Wallet"}
                          </div>
                          <div className='text-sm text-slate-500 dark:text-slate-400'>
                            {wallet.walletAddress
                              ? formatAddress(wallet.walletAddress)
                              : "Unknown"}
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                                onClick={() => copyAddress()}>
                                {copiedAddress ? (
                                  <CheckCircle2 className='h-4 w-4 text-green-600' />
                                ) : (
                                  <Copy className='h-4 w-4' />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {copiedAddress ? "Copied!" : "Copy Address"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 px-2'
                          onClick={() => handleDeleteWallet(wallet.id)}>
                          <Trash2 className='h-3.5 w-3.5 mr-1' />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-6'>
                  <div className='bg-primary/10 p-3 rounded-full inline-block mb-3'>
                    <Wallet className='h-6 w-6 text-primary' />
                  </div>
                  <h3 className='text-lg font-medium mb-1'>
                    No Wallets Connected
                  </h3>
                  <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
                    Connect a wallet to manage your assets
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <h3 className='text-lg font-medium mb-3'>
                  Connect a New Wallet
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {connectors.map((connector) => (
                    <Button
                      key={connector.id}
                      variant='outline'
                      className='justify-start h-auto py-3'
                      disabled={isConnecting}
                      onClick={() => handleConnect(connector)}>
                      {connector.name === "MetaMask" && (
                        <img
                          src='/icons/metamask.svg'
                          alt='MetaMask'
                          className='h-5 w-5 mr-2'
                        />
                      )}
                      {connector.name === "WalletConnect" && (
                        <img
                          src='/icons/walletconnect.svg'
                          alt='WalletConnect'
                          className='h-5 w-5 mr-2'
                        />
                      )}
                      {connector.name === "Coinbase Wallet" && (
                        <img
                          src='/icons/coinbase.svg'
                          alt='Coinbase'
                          className='h-5 w-5 mr-2'
                        />
                      )}
                      {![
                        "MetaMask",
                        "WalletConnect",
                        "Coinbase Wallet",
                      ].includes(connector.name) && (
                        <Wallet className='h-5 w-5 mr-2' />
                      )}
                      {connector.name}
                      {isConnecting && (
                        <Loader2 className='h-4 w-4 ml-2 animate-spin' />
                      )}
                    </Button>
                  ))}
                  <Button
                    variant='outline'
                    className='justify-start h-auto py-3'
                    onClick={() => connectWithMagic()}
                    disabled={isConnecting}>
                    <img
                      src='/icons/magic.svg'
                      alt='Magic'
                      className='h-5 w-5 mr-2'
                    />
                    Magic Link
                    {isConnecting && (
                      <Loader2 className='h-4 w-4 ml-2 animate-spin' />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/50 dark:bg-slate-900/50 border-0 shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                Network Settings
              </CardTitle>
              <CardDescription>
                Choose your preferred blockchain network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <div className='font-medium text-slate-800 dark:text-slate-200'>
                      Current Network
                    </div>
                    <div className='text-sm text-slate-500 dark:text-slate-400'>
                      {chain?.name || "Not Connected"}
                    </div>
                  </div>
                  <Select
                    value={selectedNetwork?.toString()}
                    onValueChange={(value) =>
                      handleNetworkSwitch(Number(value))
                    }>
                    <SelectTrigger className='w-[180px]'>
                      <SelectValue placeholder='Select Network' />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedNetworks.map((network) => (
                        <SelectItem
                          key={network.id}
                          value={network.id.toString()}>
                          {network.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value='settings' className='space-y-6'>
          <Card className='bg-white/50 dark:bg-slate-900/50 border-0 shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium text-slate-800 dark:text-slate-200'>
                    Auto-refresh balances
                  </div>
                  <div className='text-sm text-slate-500 dark:text-slate-400'>
                    Automatically update token balances
                  </div>
                </div>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>

              <Separator />

              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium text-slate-800 dark:text-slate-200'>
                    Hide balances
                  </div>
                  <div className='text-sm text-slate-500 dark:text-slate-400'>
                    Hide balance amounts by default
                  </div>
                </div>
                <Switch
                  checked={!balanceVisible}
                  onCheckedChange={(checked) => setBalanceVisible(!checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/50 dark:bg-slate-900/50 border-0 shadow-lg'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {isConnected && (
                <Button
                  variant='destructive'
                  className='w-full justify-start gap-2'
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}>
                  <Trash2 className='h-4 w-4' />
                  Disconnect Current Wallet
                  {isDisconnecting && (
                    <Loader2 className='h-4 w-4 ml-2 animate-spin' />
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
