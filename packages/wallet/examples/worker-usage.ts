/**
 * @zyra/wallet - Worker Integration Example
 * 
 * This file demonstrates how to integrate the wallet library in a Node.js environment
 * for the worker component of Zyra.
 */

import { createClient } from '@supabase/supabase-js';
import { ZyraWallet, ChainType } from '../src';

/**
 * Initialize wallet in worker environment
 */
export async function initializeWorkerWallet() {
  try {
    // Get environment variables
    const magicSecretKey = process.env.MAGIC_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!magicSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Create and initialize wallet
    const wallet = new ZyraWallet(magicSecretKey);
    
    // Set storage adapter
    await wallet.setStorageAdapter(supabase);
    
    // Initialize wallet
    await wallet.initialize();
    
    return wallet;
  } catch (error) {
    console.error('Failed to initialize worker wallet:', error);
    throw error;
  }
}

/**
 * Retrieve wallet information for a user
 */
export async function getUserWallets(wallet: ZyraWallet, userEmail: string) {
  try {
    // Get all wallets for the user from storage
    const wallets = await wallet.listWalletsForUser(userEmail);
    
    console.log(`Found ${wallets.length} wallets for user ${userEmail}`);
    
    // Log each wallet's details
    wallets.forEach((walletInfo, index) => {
      console.log(`Wallet ${index + 1}:`);
      console.log(`  Address: ${walletInfo.address}`);
      console.log(`  Chain: ${walletInfo.chainType} (${walletInfo.chainId})`);
      console.log(`  Provider: ${walletInfo.provider}`);
    });
    
    return wallets;
  } catch (error) {
    console.error('Failed to get user wallets:', error);
    throw error;
  }
}

/**
 * Get balance for a user's wallet
 */
export async function getWalletBalance(
  wallet: ZyraWallet, 
  userEmail: string,
  chainType: ChainType,
  chainId?: number | string
) {
  try {
    // Get wallet info for the specified chain
    const filters = { chainType, chainId };
    const walletInfo = await wallet.getWalletForUser(userEmail, filters);
    
    if (!walletInfo) {
      throw new Error(`No wallet found for user ${userEmail} on chain ${chainType} (${chainId})`);
    }
    
    // Get balance
    const balance = await wallet.getBalance(walletInfo.address, walletInfo.chainId);
    
    console.log(`Balance for ${userEmail}:`);
    console.log(`  Address: ${walletInfo.address}`);
    console.log(`  Amount: ${balance.formatted} ${balance.symbol}`);
    console.log(`  Chain: ${walletInfo.chainType} (${walletInfo.chainId})`);
    
    return { walletInfo, balance };
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    throw error;
  }
}

/**
 * Example workflow execution that involves checking wallet balance
 */
export async function executeWalletWorkflow(
  wallet: ZyraWallet,
  userEmail: string,
  workflowId: string
) {
  try {
    console.log(`Executing workflow ${workflowId} for user ${userEmail}`);
    
    // Step 1: Check if the user has a wallet
    const wallets = await getUserWallets(wallet, userEmail);
    
    if (wallets.length === 0) {
      console.log('User has no wallets. Workflow cannot proceed.');
      return { success: false, reason: 'NO_WALLET' };
    }
    
    // Step 2: Find the EVM wallet (Base Sepolia)
    const evmWallet = wallets.find(w => 
      w.chainType === ChainType.EVM && 
      w.chainId === 84532
    );
    
    if (!evmWallet) {
      console.log('User has no Base Sepolia wallet. Workflow cannot proceed.');
      return { success: false, reason: 'NO_BASE_WALLET' };
    }
    
    // Step 3: Check wallet balance
    const { balance } = await getWalletBalance(
      wallet,
      userEmail,
      ChainType.EVM,
      84532
    );
    
    // Step 4: Check if balance is sufficient for the workflow
    const requiredAmount = 0.001; // Example: 0.001 ETH
    const currentBalance = parseFloat(balance.formatted);
    
    if (currentBalance < requiredAmount) {
      console.log(`Insufficient balance. Required: ${requiredAmount} ${balance.symbol}, Current: ${currentBalance} ${balance.symbol}`);
      return { success: false, reason: 'INSUFFICIENT_BALANCE' };
    }
    
    // Step 5: Workflow execution logic would go here
    console.log(`Sufficient balance confirmed. Proceeding with workflow execution.`);
    
    // Mock workflow execution success
    return { 
      success: true, 
      address: evmWallet.address,
      balance: balance.formatted,
      currency: balance.symbol
    };
  } catch (error) {
    console.error('Workflow execution failed:', error);
    throw error;
  }
}

/**
 * Example function to monitor wallet activity across chains
 */
export async function monitorWalletActivity(wallet: ZyraWallet, userEmails: string[]) {
  try {
    const report = {
      totalWallets: 0,
      evmWallets: 0,
      solanaWallets: 0,
      userBalances: [] as any[]
    };
    
    // Process each user
    for (const email of userEmails) {
      const wallets = await getUserWallets(wallet, email);
      report.totalWallets += wallets.length;
      
      // Count by chain type
      const evmWallets = wallets.filter(w => w.chainType === ChainType.EVM);
      const solanaWallets = wallets.filter(w => w.chainType === ChainType.SOLANA);
      
      report.evmWallets += evmWallets.length;
      report.solanaWallets += solanaWallets.length;
      
      // Get balances for each wallet
      for (const walletInfo of wallets) {
        try {
          const balance = await wallet.getBalance(walletInfo.address, walletInfo.chainId);
          
          report.userBalances.push({
            user: email,
            address: walletInfo.address,
            chainType: walletInfo.chainType,
            chainId: walletInfo.chainId,
            balance: balance.formatted,
            symbol: balance.symbol
          });
        } catch (error) {
          console.error(`Failed to get balance for ${walletInfo.address}:`, error);
        }
      }
    }
    
    console.log('Wallet Activity Report:');
    console.log(`Total Wallets: ${report.totalWallets}`);
    console.log(`EVM Wallets: ${report.evmWallets}`);
    console.log(`Solana Wallets: ${report.solanaWallets}`);
    console.log('User Balances:');
    report.userBalances.forEach((item: any) => {
      console.log(`  ${item.user}: ${item.balance} ${item.symbol} (${item.chainType})`);
    });
    
    return report;
  } catch (error) {
    console.error('Failed to monitor wallet activity:', error);
    throw error;
  }
}
