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
        // Track if the request was aborted
        let isAborted = false;
        
        // Create an AbortController to handle timeouts
        const controller = new AbortController();
        const signal = controller.signal;
        
        // Set a timeout to abort the request after 15 seconds
        const timeoutId = setTimeout(() => {
          isAborted = true;
          controller.abort();
          console.warn('Auth request timed out after 15 seconds');
          set({
            error: new Error('Authentication timed out. Please try again.'),
            isLoading: false,
          });
        }, 15000);
        
        try {
          console.log(`Auth Store: Starting email login for ${email}`);
          set({ isLoading: true, error: null });
          
          // Initialize wallet if not already initialized
          console.log('Auth Store: Initializing wallet...');
          await wallet.initialize();
          
          // Connect with Magic Link
          console.log('Auth Store: Connecting with Magic Link...');
          const walletInfo = await Promise.race([
            wallet.connect(email, chainId),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Magic Link connection timed out')), 10000);
            })
          ]);
          
          if (isAborted) return; // Don't continue if request was aborted
          
          // Generate DID token for authentication
          console.log('Auth Store: Generating DID token...');
          const didToken = await Promise.race([
            wallet.generateDIDToken(),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('DID token generation timed out')), 8000);
            })
          ]);
          
          if (isAborted) return; // Don't continue if request was aborted
          
          // Call API to authenticate with the server
          console.log('Auth Store: Calling login API...');
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, didToken }),
            signal, // Add the abort signal to the fetch request
          });
          
          const authResult = await response.json();
          
          if (!response.ok) {
            throw new Error(authResult.error || 'Email login failed');
          }
          
          const user = authResult.user;
          console.log('Auth Store: Login successful!', { userId: user.id });
          
          // Update state
          set({
            user,
            wallet: walletInfo,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Check if the error was caused by the abort controller
          if (error.name === 'AbortError') {
            console.error('Login request was aborted due to timeout');
          } else {
            console.error('Login with email failed:', error);
          }
          
          // Only update state if the request wasn't manually aborted
          if (!isAborted) {
            set({
              error: error instanceof Error ? error : new Error('Login failed'),
              isLoading: false,
            });
          }
          throw error;
        } finally {
          // Clear the timeout to prevent memory leaks
          clearTimeout(timeoutId);
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
