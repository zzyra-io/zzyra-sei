/**
 * @zyra/wallet - Node.js Storage Adapter
 * 
 * This file contains the Node.js implementation of the wallet storage adapter
 * that integrates with Supabase.
 */

import { StorageAdapter, WalletStorageData } from '../../core/types';

/**
 * Node.js storage adapter for Supabase
 * 
 * This adapter is similar to the browser adapter but optimized for the Node.js environment.
 */
export class NodeStorageAdapter implements StorageAdapter {
  /**
   * Supabase client instance
   */
  public supabaseClient: any;
  
  /**
   * Table name for wallet storage
   */
  private tableName: string;
  
  /**
   * Constructor
   * 
   * @param supabaseClient Supabase client instance
   * @param tableName Table name for wallet storage (default: 'user_wallets')
   */
  constructor(supabaseClient: any, tableName: string = 'user_wallets') {
    this.supabaseClient = supabaseClient;
    this.tableName = tableName;
  }
  
  /**
   * Save wallet data to storage
   * 
   * @param data Wallet data to save
   * @returns Saved wallet data
   */
  async saveWallet(data: WalletStorageData): Promise<any> {
    const { data: result, error } = await this.supabaseClient
      .from(this.tableName)
      .upsert({
        user_id: data.userId,
        wallet_address: data.address,
        wallet_type: data.provider,
        chain_type: data.chainType,
        chain_id: String(data.chainId),
        metadata: data.metadata || {},
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }
  
  /**
   * Get wallet data from storage
   * 
   * @param userId User ID
   * @param filters Optional filters to apply
   * @returns Wallet data or null if not found
   */
  async getWallet(userId: string, filters?: Partial<WalletStorageData>): Promise<any> {
    let query = this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);
    
    if (filters?.address) {
      query = query.eq('wallet_address', filters.address);
    }
    
    if (filters?.chainType) {
      query = query.eq('chain_type', filters.chainType);
    }
    
    if (filters?.chainId) {
      query = query.eq('chain_id', String(filters.chainId));
    }
    
    if (filters?.provider) {
      query = query.eq('wallet_type', filters.provider);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) throw error;
    return data;
  }
  
  /**
   * List all wallets for a user
   * 
   * @param userId User ID
   * @returns Array of wallet data
   */
  async listWallets(userId: string): Promise<any[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  }
}

/**
 * Factory function to create Node.js storage adapter
 * 
 * @param supabaseClient Supabase client instance
 * @returns NodeStorageAdapter instance
 */
export function createNodeStorageAdapter(supabaseClient: any): NodeStorageAdapter {
  return new NodeStorageAdapter(supabaseClient);
}
