/**
 * Auth Store
 * 
 * Zustand store for authentication state management with Magic Link and Prisma
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ZyraWallet, WalletInfo, OAuthProvider } from '@zyra/wallet';
import { AuthService } from '@zyra/database';

// Initialize services
const wallet = new ZyraWallet(process.env.NEXT_PUBLIC_MAGIC_API_KEY!);
const authService = new AuthService();

// Define a user interface that matches what we get from the database
interface User {
  id: string;
  email: string | null;
  walletAddress?: string;
  chainId?: string;
  chainType?: string;
  [key: string]: unknown; // Allow other properties from the database
}

interface AuthState {
  user: User | null;
  wallet: WalletInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  loginWithEmail: (email: string, chainId?: string) => Promise<void>;
  loginWithSMS: (phoneNumber: string, chainId?: string) => Promise<void>;
  loginWithOAuth: (provider: OAuthProvider, chainId?: string) => Promise<void>;
  handleOAuthCallback: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      wallet: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      loginWithEmail: async (email, chainId) => {
        try {
          set({ isLoading: true, error: null });
          
          // Initialize wallet if not already initialized
          await wallet.initialize();
          
          // Connect with Magic Link
          const walletInfo = await wallet.connect(email, chainId);
          
          // Generate DID token for authentication
          const didToken = await wallet.generateDIDToken();
          
          // Call API to authenticate with the server
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, didToken }),
          });
          
          const authResult = await response.json();
          
          if (!response.ok) {
            throw new Error(authResult.error || 'Email login failed');
          }
          
          const user = authResult.user;
          
          // Update state
          set({
            user,
            wallet: walletInfo,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Login with email failed:', error);
          set({
            error: error instanceof Error ? error : new Error('Login failed'),
            isLoading: false,
          });
          throw error;
        }
      },
      
      loginWithSMS: async (phoneNumber, chainId) => {
        try {
          set({ isLoading: true, error: null });
          
          // Initialize wallet if not already initialized
          await wallet.initialize();
          
          // Connect with SMS
          const walletInfo = await wallet.connectWithSMS(phoneNumber, chainId);
          
          // Generate DID token for authentication
          const didToken = await wallet.generateDIDToken();
          
          // Call API to authenticate with the server
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ phoneNumber, didToken }),
          });
          
          const authResult = await response.json();
          
          if (!response.ok) {
            throw new Error(authResult.error || 'SMS login failed');
          }
          
          const user = authResult.user;
          
          // Update state
          set({
            user,
            wallet: walletInfo,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Login with SMS failed:', error);
          set({
            error: error instanceof Error ? error : new Error('SMS login failed'),
            isLoading: false,
          });
          throw error;
        }
      },
      
      loginWithOAuth: async (provider, chainId) => {
        try {
          set({ isLoading: true, error: null });
          
          // Initialize wallet if not already initialized
          await wallet.initialize();
          
          // Start OAuth flow - this will redirect
          await wallet.connectWithOAuth(provider, chainId);
          
          // Note: State update happens in handleOAuthCallback after redirect
        } catch (error) {
          console.error('OAuth login failed:', error);
          set({
            error: error instanceof Error ? error : new Error('OAuth login failed'),
            isLoading: false,
          });
          throw error;
        }
      },
      
      handleOAuthCallback: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Initialize wallet if not already initialized
          await wallet.initialize();
          
          // Complete OAuth flow
          const walletInfo = await wallet.handleOAuthCallback();
          
          // For OAuth, we'll use the wallet address to authenticate
          const walletAddress = await wallet.getAddress();
          const chainId = walletInfo?.chainId || '1';
          const chainType = 'evm';
          
          // Authenticate with wallet address
          const authResult = await authService.authenticateWithWallet(
            walletAddress as string,
            String(chainId),
            chainType
          );
          
          const user = authResult.user;
          
          // Update state
          set({
            user,
            wallet: walletInfo,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('OAuth callback handling failed:', error);
          set({
            error: error instanceof Error ? error : new Error('OAuth callback failed'),
            isLoading: false,
          });
          throw error;
        }
      },
      
      logout: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { user } = get();
          
          // Disconnect wallet
          await wallet.disconnect();
          
          // Logout from backend
          if (user?.id) {
            await authService.signOut(user.id);
          }
          
          // Update state
          set({
            user: null,
            wallet: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('Logout failed:', error);
          set({
            error: error instanceof Error ? error : new Error('Logout failed'),
            isLoading: false,
          });
          throw error;
        }
      },
    }),
    {
      name: 'zyra-auth-storage',
      partialize: (state) => ({
        user: state.user,
        wallet: state.wallet,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
