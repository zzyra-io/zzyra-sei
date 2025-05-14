/**
 * Authentication Service
 * 
 * This service provides authentication functionality for the Zyra platform.
 * It integrates with the JWT service and user repository to manage user authentication.
 */

import { User } from '@prisma/client';
import { JwtService } from './jwt.service';
import { AuthError, AuthResult, JwtPayload, MagicAuthPayload, Session } from './types';
import { UserRepository } from '../repositories/user.repository';
import { BlockType } from '@zyra/types';

export class AuthService {
  private jwtService: JwtService;
  private userRepository: UserRepository;

  constructor() {
    this.jwtService = new JwtService();
    this.userRepository = new UserRepository();
  }

  /**
   * Create a session for a user
   * @param user The user to create a session for
   * @returns The session information
   */
  async createSession(user: User): Promise<AuthResult> {
    // Create JWT payload
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email || undefined,
    };

    // Generate JWT token
    const accessToken = this.jwtService.generateToken(payload);

    // Generate refresh token
    const refreshToken = await this.jwtService.generateRefreshToken(user.id);

    // Calculate expiration time
    const decodedToken = this.jwtService.verifyToken(accessToken);
    const expiresAt = decodedToken?.exp || 0;

    // Get user with profile
    const userWithProfile = await this.userRepository.findWithProfileAndWallets(user.id);

    // Update last seen
    if (userWithProfile?.profile) {
      await this.userRepository.updateLastSeen(user.id);
    }

    // Create session
    const session: Session = {
      user: {
        id: user.id,
        email: user.email || undefined,
        walletAddress: userWithProfile?.userWallets[0]?.walletAddress,
      },
      accessToken,
      refreshToken: refreshToken.token,
      expiresAt,
    };

    return {
      user: userWithProfile || user,
      session,
    };
  }

  /**
   * Authenticate with Magic Link
   * @param payload The Magic authentication payload
   * @returns The authentication result
   */
  async authenticateWithMagic(payload: MagicAuthPayload): Promise<AuthResult> {
    try {
      // Verify DID token with Magic (this would be implemented separately)
      // const userInfo = await verifyMagicToken(payload.didToken);
      
      // For now, we'll assume the token is valid and contains the email
      const email = payload.email;
      
      if (!email) {
        throw new AuthError('Email is required for Magic Link authentication', 'auth/invalid-email');
      }

      // Find or create user
      let user = await this.userRepository.findByEmail(email);

      if (!user) {
        // Create new user
        user = await this.userRepository.createWithProfile(
          { email },
          {
            email,
            subscriptionTier: 'free',
            subscriptionStatus: 'inactive',
            monthlyExecutionQuota: 100,
            monthlyExecutionCount: 0,
          }
        );
      }

      // Create session
      return this.createSession(user);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Failed to authenticate with Magic Link',
        'auth/magic-link-failed'
      );
    }
  }

  /**
   * Authenticate with wallet
   * @param walletAddress The wallet address
   * @param chainId The blockchain chain ID
   * @param chainType The blockchain chain type
   * @returns The authentication result
   */
  async authenticateWithWallet(
    walletAddress: string,
    chainId: string,
    chainType: string
  ): Promise<AuthResult> {
    try {
      // Find user by wallet address
      let user = await this.userRepository.findByWalletAddress(walletAddress);

      if (!user) {
        // Create new user
        user = await this.userRepository.create({});
        
        // Add wallet
        await this.userRepository.addWallet(user.id, {
          walletAddress,
          chainId,
          chainType,
        });
        
        // Create profile
        await this.userRepository.updateProfile(user.id, {
          subscriptionTier: 'free',
          subscriptionStatus: 'inactive',
          monthlyExecutionQuota: 100,
          monthlyExecutionCount: 0,
        });
        
        // Reload user with profile and wallets
        user = await this.userRepository.findWithProfileAndWallets(user.id);
      }

      // Create session
      return this.createSession(user as User);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Failed to authenticate with wallet',
        'auth/wallet-auth-failed'
      );
    }
  }

  /**
   * Refresh a session
   * @param refreshToken The refresh token
   * @returns The new session information
   */
  async refreshSession(refreshToken: string): Promise<AuthResult | null> {
    try {
      // Refresh the token
      const result = await this.jwtService.refreshToken(refreshToken);
      if (!result) return null;

      // Get user
      const user = await this.userRepository.findWithProfileAndWallets(result.refreshToken.userId);
      if (!user) return null;

      // Calculate expiration time
      const accessToken = result.token;
      const decodedToken = this.jwtService.verifyToken(accessToken);
      const expiresAt = decodedToken?.exp || 0;

      // Create session
      const session: Session = {
        user: {
          id: user.id,
          email: user.email || undefined,
          walletAddress: user.userWallets[0]?.walletAddress,
        },
        accessToken,
        refreshToken: result.refreshToken.token,
        expiresAt,
      };

      return {
        user,
        session,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Sign out a user
   * @param userId The user ID
   */
  async signOut(userId: string): Promise<void> {
    await this.jwtService.invalidateAllTokens(userId);
  }

  /**
   * Verify a session token
   * @param token The session token
   * @returns The user ID if valid, null otherwise
   */
  verifySession(token: string): string | null {
    const payload = this.jwtService.verifyToken(token);
    return payload?.userId || null;
  }

  /**
   * Get user by ID
   * @param userId The user ID
   * @returns The user with profile and wallets
   */
  async getUserById(userId: string) {
    return this.userRepository.findWithProfileAndWallets(userId);
  }
}
