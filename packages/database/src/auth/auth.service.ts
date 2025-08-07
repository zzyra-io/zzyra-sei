/**
 * Authentication Service
 *
 * This service provides authentication functionality for the Zzyra platform.
 * It integrates with the JWT service and user repository to manage user authentication.
 */

import { PrismaClient, User } from "@prisma/client";
import { JwtService } from "./jwt.service";
import { AuthError, AuthResult, JwtPayload, Session } from "./types";
import { UserRepository } from "../repositories/user.repository";
import { BlockType } from "@zyra/types";

export class AuthService {
  private jwtService: JwtService;
  private userRepository: UserRepository;
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.jwtService = new JwtService();
    this.userRepository = new UserRepository(prismaClient);
  }

  /**
   * Signs out a user by invalidating all their tokens
   * @param userId The ID of the user to sign out
   */
  async signOut(userId: string): Promise<void> {
    try {
      console.log(`AuthService: Signing out user with ID: ${userId}`);

      // Invalidate all JWT tokens for this user
      await this.jwtService.invalidateAllTokens(userId);

      console.log(`AuthService: User ${userId} signed out successfully`);
    } catch (error) {
      console.error(`AuthService: Failed to sign out user ${userId}:`, error);
      throw new AuthError("Failed to sign out user", "auth/logout-failed");
    }
  }

  /**
   * Generate JWT token for user
   * @param user The user to generate a token for
   * @returns The JWT token
   */
  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email || undefined,
    };
    return this.jwtService.generateToken(payload);
  }

  /**
   * Create a session for a user
   * @param user The user to create a session for
   * @returns The session information
   */
  async createSession(user: User): Promise<AuthResult> {
    // Generate JWT token
    const accessToken = this.generateToken(user);

    // Generate refresh token
    const refreshToken = await this.jwtService.generateRefreshToken(user.id);

    // Calculate expiration time
    const decodedToken = this.jwtService.verifyToken(accessToken);
    const expiresAt = decodedToken?.exp || 0;

    // Get user with profile
    const userWithProfile = await this.userRepository.findWithProfileAndWallets(
      user.id
    );
    if (!userWithProfile) throw new Error("User not found or missing wallets");

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

    // Ensure user has the required shape for AuthUser
    return {
      user: {
        ...user,
        profile: userWithProfile?.profile || null,
        userWallets: userWithProfile?.userWallets || [],
      },
      session,
    };
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
        // Create new user with empty data and initialize with empty wallet array
        const newUser = await this.userRepository.create({});
        user = { ...newUser, userWallets: [] };

        if (user) {
          // Add wallet
          await this.userRepository.addWallet(user.id, {
            walletAddress,
            chainId,
            chainType,
          });

          // Create profile
          await this.userRepository.updateProfile(user.id, {
            subscriptionTier: "free",
            subscriptionStatus: "inactive",
            monthlyExecutionQuota: 100,
            monthlyExecutionCount: 0,
          });

          // Reload user with profile and wallets
          const updatedUser =
            await this.userRepository.findWithProfileAndWallets(user.id);
          if (updatedUser) {
            user = updatedUser;
          }
        }
      }

      // Create session
      return this.createSession(user as User);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        "Failed to authenticate with wallet",
        "auth/wallet-auth-failed"
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
      const user = await this.userRepository.findWithProfileAndWallets(
        result.refreshToken.userId
      );
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
   * Logout a user by token
   * @param token The user's JWT token
   */
  async logoutUser(token: string): Promise<void> {
    try {
      // Verify the token to get the user ID
      const payload = this.jwtService.verifyToken(token);
      if (!payload?.userId) {
        throw new Error("Invalid token");
      }

      // Invalidate all tokens for this user
      await this.jwtService.invalidateAllTokens(payload.userId);
    } catch (error) {
      console.error("Failed to logout user:", error);
      throw new AuthError("Failed to logout", "auth/logout-failed");
    }
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
