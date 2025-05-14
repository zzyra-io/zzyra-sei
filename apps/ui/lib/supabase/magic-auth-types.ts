/**
 * Magic SDK Integration Types
 *
 * This file defines the types used for the Magic SDK integration with Supabase.
 * It ensures type safety across the authentication flow and follows the Zyra 
 * platform's architecture design of centralized type definitions.
 */

import { Session, User } from '@supabase/supabase-js';
import { OAuthProvider } from '@zyra/wallet';

/**
 * Magic authentication request payload for server-side API
 */
export interface MagicAuthPayload {
  /** DID token from Magic SDK */
  didToken: string;
  /** Optional OAuth provider for social login flows */
  provider?: string;
  /** Optional email for email-based authentication */
  email?: string;
}

/**
 * Magic authentication response from server-side API
 */
export interface MagicAuthResponse {
  /** Supabase session data */
  session: Session;
  /** Supabase user data */
  user: User;
}

/**
 * Magic authentication error response
 */
export interface MagicAuthError {
  /** Error message */
  error: string;
  /** Optional error code */
  code?: string;
}

/**
 * Maps OAuth provider from Magic SDK to Supabase provider name
 * 
 * @param provider OAuth provider from Magic SDK
 * @returns Supabase provider name
 */
export function mapMagicProviderToSupabase(provider: OAuthProvider | string): string {
  const providerMap: Record<string, string> = {
    'google': 'google',
    'facebook': 'facebook',
    'twitter': 'twitter',
    'github': 'github',
    'apple': 'apple',
    'linkedin': 'linkedin',
    'discord': 'discord'
  };
  
  // Convert provider to string safely
  const providerString = String(provider).toLowerCase();
  return providerMap[providerString] || providerString;
}
