"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { walletService } from '@/lib/services/wallet-service';
import { WalletInfo, WalletBalance, ChainType } from '@/lib/services/wallet-service';
import { Copy, ExternalLink, Loader2, RefreshCw, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function WalletDisplay() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchWallet();
  }, []);
  
  const fetchWallet = async () => {
    try {
      setLoading(true);
      const walletInfo = await walletService.getCurrentWallet();
      if (walletInfo) {
        setWallet(walletInfo);
        const walletBalance = await walletService.getBalance(walletInfo.address);
        setBalance(walletBalance);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const refreshBalance = async () => {
    if (!wallet) return;
    
    try {
      setRefreshing(true);
      const walletBalance = await walletService.getBalance(wallet.address);
      setBalance(walletBalance);
      
      // Only show toast if called manually (not during other operations)
      if (!sending) {
        toast({
          title: "Balance refreshed",
          description: `Your current balance is ${walletBalance.formatted} ${walletBalance.symbol}`,
        });
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh wallet balance",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  const copyAddress = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet.address);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };
  
  const getNetworkName = (chainType: ChainType, chainId: number | string) => {
    if (chainType === ChainType.EVM) {
      if (chainId === 84532) return "Base Sepolia Testnet";
      return `EVM Chain (${chainId})`;
    } else if (chainType === ChainType.SOLANA) {
      if (chainId === 'devnet') return "Solana Devnet";
      if (chainId === 'mainnet-beta') return "Solana Mainnet";
      return `Solana (${chainId})`;
    }
    return "Unknown Network";
  };
  
  const getExplorerUrl = (chainType: ChainType, chainId: number | string, address: string) => {
    if (chainType === ChainType.EVM) {
      if (chainId === 84532) return `https://sepolia.basescan.org/address/${address}`;
      return `https://etherscan.io/address/${address}`;
    } else if (chainType === ChainType.SOLANA) {
      const network = chainId === 'mainnet-beta' ? '' : `?cluster=${chainId}`;
      return `https://explorer.solana.com/address/${address}${network}`;
    }
    return "#";
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Wallet</CardTitle>
          <CardDescription>Loading wallet information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Wallet</CardTitle>
          <CardDescription>No wallet connected</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">You need to connect a wallet to access blockchain features.</p>
          <p className="text-sm">Use the Magic Link option on the login page to automatically set up a wallet.</p>
        </CardContent>
      </Card>
    );
  }
  
    // Send transaction function
  const sendTransaction = async () => {
    if (!wallet || !recipient.trim() || !amount.trim()) return;
    
    try {
      setSending(true);
      setTxHash(null);
      
      // Import from viem to format ether
      const { parseEther } = await import('viem');
      
      // Create a simple JSON-RPC request to send transaction
      // This is a placeholder - in a real implementation we'd use the wallet.sendTransaction method
      const provider = await walletService.getProvider();
      if (!provider) throw new Error("Wallet provider not available");
      
      // For demo purposes, we're creating a simple transaction
      const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: recipient,
          value: parseEther(amount).toString(16), // Convert to hex
          gas: '0x5208', // 21000 gas limit for simple transfers
        }],
      });
      
      setTxHash(tx as string);
      
      toast({
        title: "Transaction sent",
        description: `Successfully sent ${amount} ETH to ${truncateAddress(recipient)}`,
      });
      
      // Reset form and close dialog
      setDialogOpen(false);
      setRecipient('');
      setAmount('');
      
      // Refresh balance after transaction
      await refreshBalance();
    } catch (error) {
      console.error('Transaction failed:', error);
      toast({
        title: "Transaction failed",
        description: error instanceof Error ? error.message : "Failed to send transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Your Wallet</CardTitle>
            <CardDescription>Manage your blockchain wallet</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshBalance} 
            disabled={refreshing}
            title="Refresh balance"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Address</p>
              <div className="flex items-center space-x-2">
                <code className="bg-muted px-2 py-1 rounded">{truncateAddress(wallet.address)}</code>
                <Button variant="ghost" size="icon" onClick={copyAddress} title="Copy address">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="View in explorer"
                  onClick={() => window.open(getExplorerUrl(wallet.chainType, wallet.chainId, wallet.address), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {balance && (
              <div>
                <p className="text-sm font-medium mb-1">Balance</p>
                <p className="text-2xl font-bold">
                  {balance.formatted} <span className="text-sm font-medium">{balance.symbol}</span>
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium mb-1">Network</p>
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${wallet.chainType === ChainType.EVM ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                <p>{getNetworkName(wallet.chainType, wallet.chainId)}</p>
              </div>
            </div>
            
            <Button 
              className="w-full mt-4" 
              onClick={() => setDialogOpen(true)}
              disabled={sending}
            >
              <Send className="mr-2 h-4 w-4" />
              Send {balance?.symbol}
            </Button>
            
            {txHash && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-1">Latest Transaction</p>
                <a 
                  href={getExplorerUrl(wallet.chainType, wallet.chainId, txHash).replace('/address/', '/tx/')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center"
                >
                  {truncateAddress(txHash)}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {balance?.symbol}</DialogTitle>
            <DialogDescription>
              Send {balance?.symbol} to another wallet address. Please double check the recipient address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input 
                id="recipient" 
                placeholder="0x..." 
                value={recipient} 
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({balance?.symbol})</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="0.01" 
                step="0.001"
                min="0.0001"
                max={balance ? parseFloat(balance.formatted) : 0}
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
              />
              {balance && (
                <p className="text-xs text-muted-foreground">
                  Available: {balance.formatted} {balance.symbol}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={sendTransaction} 
              disabled={sending || !recipient.trim() || !amount.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
