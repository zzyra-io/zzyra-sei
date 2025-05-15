/**
 * Authentication Types
 *
 * This module defines types for the authentication system.
 */

import { User, Profile, UserWallet } from "@prisma/client";

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  userId: string;
  email?: string;
  walletAddress?: string;
  iat?: number;
  exp?: number;
}

/**
 * Session information
 */
export interface Session {
  user: {
    id: string;
    email?: string;
    walletAddress?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Auth user with profile
 */
export type AuthUser = User & {
  profile?: Profile | null;
  userWallets?: UserWallet[];
};

/**
 * Magic link authentication payload
 */
export interface MagicAuthPayload {
  didToken: string;
  provider?: string;
  email?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: AuthUser;
  session: Session;
}

/**
 * Refresh token data
 */
export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication error
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}
