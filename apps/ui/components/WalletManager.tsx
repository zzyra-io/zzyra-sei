"use client";

import React from "react";
import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi";
import { useWallet } from "@zyra/wallet"; // Assuming this is the correct import path for your hook

export function WalletManager() {
  const { address, connector, isConnected, chain } = useAccount();
  const {
    connect,
    connectors,
    error: connectError,
    status: connectStatus,
  } = useConnect();
  const { disconnect, status: disconnectStatus } = useDisconnect();
  const { data: ensName } = useEnsName({ address });

  const isConnecting = connectStatus === "pending";
  const isDisconnecting = disconnectStatus === "pending";

  // From your @zyra/wallet package - adjust property names if they differ in your implementation
  const {
    persistedWallet,
    isLoading: isWalletLoading, // Assuming 'isLoading' is the correct prop name
    error: walletError, // Assuming 'error' is the correct prop name
    // syncWalletWithDb,
    // fetchUserPersistedWallets
  } = useWallet();

  if (isConnected) {
    return (
      <div
        style={{
          padding: "20px",
          fontFamily: "Arial, sans-serif",
          border: "1px solid #ccc",
          borderRadius: "8px",
          maxWidth: "400px",
          margin: "20px auto",
        }}>
        <h3 style={{ marginTop: 0 }}>Connected Wallet</h3>
        <div>
          <strong>Address:</strong>{" "}
          {ensName ? `${ensName} (${address})` : address}
        </div>
        <div>
          <strong>Connected to:</strong> {connector?.name}
        </div>
        <div>
          <strong>Chain:</strong> {chain?.name} (ID: {chain?.id})
        </div>

        {isWalletLoading && <p>Loading application wallet info...</p>}
        {walletError && (
          <p style={{ color: "red" }}>
            Error loading application data: {walletError.message}
          </p>
        )}
        {persistedWallet && (
          <div
            style={{
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid #eee",
            }}>
            <h4>Application Wallet Info:</h4>
            <div>ID: {persistedWallet.id}</div>
            <div>Type: {persistedWallet.walletType}</div>
            <div>Address (from DB): {persistedWallet.walletAddress}</div>
            <div>User ID: {persistedWallet.userId}</div>
            {/* Display other persistedWallet properties as needed */}
          </div>
        )}

        <button
          onClick={() => disconnect()}
          disabled={isDisconnecting}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            cursor: "pointer",
          }}>
          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        border: "1px solid #ccc",
        borderRadius: "8px",
        maxWidth: "300px",
        margin: "20px auto",
        textAlign: "center",
      }}>
      <h3 style={{ marginTop: 0 }}>Connect Your Wallet</h3>
      {connectors.map((conn) => (
        <button
          key={conn.id}
          onClick={() => connect({ connector: conn })}
          disabled={isConnecting}
          style={{
            display: "block",
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            cursor: "pointer",
          }}>
          {isConnecting && connectStatus === "pending"
            ? `Connecting...`
            : `Connect with ${conn.name}`}
        </button>
      ))}
      {!connectors.length && <p>No wallet connectors configured.</p>}
      {connectError && (
        <p style={{ color: "red", marginTop: "10px" }}>
          Error: {connectError.message}
        </p>
      )}
    </div>
  );
}
