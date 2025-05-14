/**
 * @zyra/wallet - UI Integration Example
 * 
 * This file demonstrates how to integrate the wallet library in a UI environment
 * using Next.js and Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { ZyraWallet, ChainType } from '../src';

/**
 * Example React component for wallet integration
 */
export async function initializeWallet() {
  try {
    // Get environment variables
    const magicPublishableKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!magicPublishableKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Create and initialize wallet
    const wallet = new ZyraWallet(magicPublishableKey);
    
    // Set storage adapter
    await wallet.setStorageAdapter(supabase);
    
    // Initialize wallet
    await wallet.initialize();
    
    return wallet;
  } catch (error) {
    console.error('Failed to initialize wallet:', error);
    throw error;
  }
}

/**
 * Example function to connect a wallet for a user
 */
export async function connectWallet(wallet: ZyraWallet, email: string) {
  try {
    // Connect to wallet with Magic Link
    const walletInfo = await wallet.connect(email);
    
    console.log(`Connected to wallet: ${walletInfo.address}`);
    console.log(`Chain: ${walletInfo.chainType} (${walletInfo.chainId})`);
    
    // Get wallet balance
    const balance = await wallet.getBalance(walletInfo.address);
    console.log(`Balance: ${balance.formatted} ${balance.symbol}`);
    
    return walletInfo;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    throw error;
  }
}

/**
 * Example function to send a transaction
 */
export async function sendTransaction(
  wallet: ZyraWallet, 
  recipientAddress: string, 
  amount: string
) {
  try {
    // Check if connected
    const isConnected = await wallet.isConnected();
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    // Get current address
    const address = await wallet.getAddress();
    if (!address) {
      throw new Error('No wallet address found');
    }
    
    // Send transaction (EVM)
    const txResult = await wallet.sendTransaction({
      chainType: ChainType.EVM,
      chainId: 84532, // Base Sepolia
      to: recipientAddress,
      value: amount
    });
    
    console.log(`Transaction sent: ${txResult.hash}`);
    console.log(`From: ${txResult.from}`);
    console.log(`To: ${txResult.to}`);
    console.log(`Value: ${txResult.value}`);
    
    return txResult;
  } catch (error) {
    console.error('Failed to send transaction:', error);
    throw error;
  }
}

/**
 * Example function to switch chains
 */
export async function switchToSolana(wallet: ZyraWallet) {
  try {
    // Switch to Solana devnet
    await wallet.switchChain('devnet');
    console.log('Switched to Solana devnet');
    
    // Get current address (now on Solana)
    const address = await wallet.getAddress();
    if (address) {
      const balance = await wallet.getBalance(address);
      console.log(`Solana balance: ${balance.formatted} ${balance.symbol}`);
    }
  } catch (error) {
    console.error('Failed to switch to Solana:', error);
    throw error;
  }
}

/**
 * Example function to sign a message
 */
export async function signMessage(wallet: ZyraWallet, message: string) {
  try {
    const signature = await wallet.signMessage(message);
    console.log(`Message signed: ${signature}`);
    return signature;
  } catch (error) {
    console.error('Failed to sign message:', error);
    throw error;
  }
}

/**
 * Example function to disconnect wallet
 */
export async function disconnectWallet(wallet: ZyraWallet) {
  try {
    await wallet.disconnect();
    console.log('Wallet disconnected');
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
    throw error;
  }
}
