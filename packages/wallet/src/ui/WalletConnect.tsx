/**
 * Wallet Connect Component
 *
 * React component for connecting to wallets using wagmi and Magic
 */
import React, { useState } from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { useWallet } from "../hooks/useWallet";

interface WalletConnectProps {
  // onConnect prop might be better handled by parent observing wagmi state (e.g. useAccount)
  // onConnect?: (data: { address: string; connectorId?: string }) => void;
  onError?: (error: Error) => void;
}

export function WalletConnect({
  // onConnect: onConnectProp, // Removed for now, rely on useAccount state changes
  onError: onErrorProp,
}: WalletConnectProps) {
  const {
    connect,
    connectors,
    error: wagmiError,
    status: connectStatus,
  } = useConnect();
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();

  const {
    appError: dbOperationError,
    persistedWallet,
    isLoadingPersistedWallet,
  } = useWallet();

  const magicConnector = connectors.find(
    (c) => c.id === "magic" || c.name.toLowerCase().includes("magic")
  );
  const isLoadingConnection = connectStatus === "pending";

  const handleConnect = async () => {
    if (!magicConnector) {
      onErrorProp?.(
        new Error("Magic connector not found. Ensure WagmiConfig is set up.")
      );
      return;
    }
    try {
      // For wagmi v2, connect() itself doesn't return account details to use directly.
      // It triggers the connection, and useAccount() hook updates with new status.
      await connect({ connector: magicConnector });
      // If onConnectProp was vital here, it would typically be after confirming
      // isConnected flips to true via useAccount, possibly in a useEffect.
    } catch (e: any) {
      onErrorProp?.(e instanceof Error ? e : new Error("Connection failed"));
    }
  };

  if (isConnected && address) {
    return (
      <div>
        <p>Connected: {address}</p>
        {activeConnector && <p>Connector: {activeConnector.name}</p>}
        {isLoadingPersistedWallet && <p>Loading wallet data...</p>}
        {persistedWallet && <p>DB Wallet ID: {persistedWallet.id}</p>}
        <button onClick={() => disconnect()}>Disconnect</button>
        {dbOperationError && (
          <p style={{ color: "red" }}>App Error: {dbOperationError.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className='wallet-connect'>
      <h3>Connect Wallet</h3>
      <div className='connect-options'>
        {magicConnector ? (
          <button
            onClick={handleConnect}
            disabled={isLoadingConnection || !magicConnector}>
            {isLoadingConnection
              ? "Connecting..."
              : // Safer loading text if variables.connector.id is unreliable
                `Connect with ${magicConnector.name}`}
          </button>
        ) : (
          <p>Magic connector not available.</p>
        )}
      </div>
      {wagmiError && (
        <p style={{ color: "red" }}>Error: {wagmiError.message}</p>
      )}
    </div>
  );
}
