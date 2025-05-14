/**
 * @zyra/wallet - Browser Storage Adapter
 * 
 * This file contains the browser implementation of the wallet storage adapter
 * that integrates with Supabase.
 */

import { StorageAdapter, WalletStorageData } from '../../core/types';

/**
 * Browser storage adapter for Supabase
 */
export class BrowserStorageAdapter implements StorageAdapter {
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
    try {
      // Always get the current authenticated user from Supabase
      const { data: authUser } = await this.supabaseClient.auth.getUser();
      
      // We must have a valid UUID for the database
      if (!authUser?.user?.id) {
        throw new Error('Cannot save wallet: No authenticated user found with valid UUID');
      }
      
      const userId = authUser.user.id; // Use UUID only, never the email
      
      // Log for debugging
      console.log('Saving wallet with UUID:', userId);
      
      // Insert/update the wallet record
      const { data: result, error } = await this.supabaseClient
        .from(this.tableName)
        .upsert({
          user_id: userId, // Only use UUID, never email
          wallet_address: data.address,
          wallet_type: data.provider,
          chain_type: data.chainType,
          chain_id: String(data.chainId),
          metadata: data.metadata || {},
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Database error while saving wallet:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Error saving wallet:', error);
      throw error;
    }
  }
  
  /**
   * Get wallet data from storage
   * 
   * @param userId User ID
   * @param filters Optional filters to apply
   * @returns Wallet data or null if not found
   */
  async getWallet(userId: string, filters?: Partial<WalletStorageData>): Promise<any> {
    try {
      // Always get the current authenticated user from Supabase
      const { data: authUser } = await this.supabaseClient.auth.getUser();
      
      // We must have a valid UUID for the database
      if (!authUser?.user?.id) {
        throw new Error('Cannot get wallet: No authenticated user found with valid UUID');
      }
      
      const queryUserId = authUser.user.id; // Use UUID only, never the email
      
      // Log for debugging
      console.log('Getting wallet with UUID:', queryUserId);
      
      let query = this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('user_id', queryUserId);
      
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
      
      if (error) {
        console.error('Database error while getting wallet:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting wallet:', error);
      throw error;
    }
  }
  
  /**
   * List all wallets for a user
   * 
   * @param userId User ID
   * @returns Array of wallet data
   */
  async listWallets(userId: string): Promise<any[]> {
    try {
      // Always get the current authenticated user from Supabase
      const { data: authUser } = await this.supabaseClient.auth.getUser();
      
      // We must have a valid UUID for the database
      if (!authUser?.user?.id) {
        throw new Error('Cannot list wallets: No authenticated user found with valid UUID');
      }
      
      const queryUserId = authUser.user.id; // Use UUID only, never the email
      
      // Log for debugging
      console.log('Listing wallets with UUID:', queryUserId);
      
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('user_id', queryUserId);
      
      if (error) {
        console.error('Database error while listing wallets:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error listing wallets:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create browser storage adapter
 * 
 * @param supabaseClient Supabase client instance
 * @returns BrowserStorageAdapter instance
 */
export function createBrowserStorageAdapter(supabaseClient: any): BrowserStorageAdapter {
  return new BrowserStorageAdapter(supabaseClient);
}
