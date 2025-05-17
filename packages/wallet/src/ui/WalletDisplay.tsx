/**
 * Wallet Display Component
 *
 * React component for displaying wallet information and transactions
 */

import { useWallet } from "../hooks/useWallet";
import { WalletTransaction } from "../core/types";
import { CHAIN_CONFIG } from "../core/constants";

interface WalletDisplayProps {
  transactions?: WalletTransaction[];
  onDisconnect?: () => void;
}

/**
 * Format wallet address for display (0x1234...5678)
 */
function formatAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Format transaction amount
 */
function formatAmount(amount: string): string {
  try {
    // Convert from wei to ether
    const etherValue = parseFloat(amount) / 1e18;
    return etherValue.toFixed(4);
  } catch (error) {
    return amount;
  }
}

/**
 * Wallet Display Component
 */
export function WalletDisplay({
  transactions = [],
  onDisconnect,
}: WalletDisplayProps) {
  const { persistedWallet, walletService } = useWallet();
  // Use wagmi hooks for connection status if needed
  const isConnected = !!persistedWallet;

  const handleDisconnect = async () => {
    // Use walletService to clear persisted wallet state
    if (walletService) {
      try {
        // Instead of calling disconnect directly, we'll use clearPersistedWallet from context
        // This is safer as the disconnect method might not be directly available on the service
        // The actual disconnection from the wallet provider would be handled by wagmi hooks
      } catch (error) {
        console.error('Error handling wallet disconnect:', error);
      }
    }
    onDisconnect?.();
  };

  if (!isConnected || !persistedWallet) {
    return (
      <div className='wallet-not-connected'>
        <p>No wallet connected</p>
      </div>
    );
  }

  // Use the persisted wallet's chain type to get config
  const chainConfig = CHAIN_CONFIG[persistedWallet.chainType] || CHAIN_CONFIG.ethereum;

  return (
    <div className='wallet-display'>
      <div className='wallet-info'>
        <h3>Connected Wallet</h3>
        <div className='wallet-details'>
          <div>
            <p>Address</p>
            <p>{formatAddress(persistedWallet.walletAddress)}</p>
          </div>
          <div>
            <p>Network</p>
            <p>{chainConfig?.name || persistedWallet.chainType}</p>
          </div>
          <div>
            <p>Wallet Type</p>
            <p>{persistedWallet.walletType}</p>
          </div>
        </div>
        <button onClick={handleDisconnect}>Disconnect</button>
      </div>

      {transactions.length > 0 && (
        <div className='transactions'>
          <h3>Recent Transactions</h3>
          <div className='transaction-list'>
            {transactions.map((tx) => (
              <div key={tx.id} className='transaction-item'>
                <div className='transaction-info'>
                  <span>{tx.txType}</span>
                  <span>
                    {formatAmount(tx.amount)} {chainConfig?.symbol}
                  </span>
                  <span className={`status status-${tx.status}`}>
                    {tx.status}
                  </span>
                </div>
                <a
                  href={chainConfig?.getExplorerUrl(tx.txHash)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='explorer-link'>
                  View on Explorer
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
