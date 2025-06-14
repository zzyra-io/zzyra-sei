/**
 * Authentication Service
 *
 * This service provides authentication functionality for the Zzyra platform.
 * It integrates with the JWT service, Magic service, and user repository to manage user authentication.
 */

import { PrismaClient, User } from "@prisma/client";
import { JwtService } from "./jwt.service";
import { MagicService, getMagicService } from "./magic.service";
import {
  AuthError,
  AuthResult,
  JwtPayload,
  MagicAuthPayload,
  Session,
} from "./types";
import { UserRepository } from "../repositories/user.repository";
import { BlockType } from "@zyra/types";

export class AuthService {
  private jwtService: JwtService;
  private userRepository: UserRepository;
  private magicService: MagicService | null = null;
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.jwtService = new JwtService();
    this.userRepository = new UserRepository(prismaClient);

    try {
      this.magicService = getMagicService();
    } catch (error) {
      console.warn(
        "Magic Service initialization failed, some auth features may be limited",
        error
      );
    }
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
   * Authenticate with Magic Link
   * @param payload The Magic authentication payload
   * @returns The authentication result
   */
  async authenticateWithMagic(payload: MagicAuthPayload): Promise<AuthResult> {
    try {
      console.log("AuthService: Starting Magic authentication");

      // Validate required parameters
      if (!payload.didToken) {
        console.error("DID token is missing");
        throw new AuthError(
          "DID token is required for Magic Link authentication",
          "auth/missing-token"
        );
      }

      if (!payload.email) {
        console.error("Email is missing");
        throw new AuthError(
          "Email is required for Magic Link authentication",
          "auth/missing-email"
        );
      }

      // Verify DID token with Magic Admin SDK
      if (!this.magicService) {
        console.error("Magic service is not available");
        throw new AuthError(
          "Magic service is not available",
          "auth/service-unavailable"
        );
      }

      try {
        // Basic validation of DID token
        await this.magicService.validateToken(payload.didToken);
        console.log("DID token validation successful");
      } catch (validationError) {
        console.error("DID token validation failed:", validationError);
        throw new AuthError(
          "Failed to validate Magic Link token",
          "auth/invalid-token"
        );
      }

      // Use the email from the payload
      const email = payload.email;
      console.log("AuthService: Using email for authentication:", email);

      // Detect if this is an OAuth login
      const isOAuth = payload.isOAuth === true;
      const oauthProvider = payload.oauthProvider || "unknown";
      const oauthUserInfo = payload.oauthUserInfo;

      if (isOAuth) {
        console.log(
          `AuthService: Processing OAuth login from provider: ${oauthProvider}`
        );
        if (oauthUserInfo) {
          console.log("OAuth user info available:", {
            name: oauthUserInfo.name,
            email: oauthUserInfo.email,
            hasProfilePicture: !!oauthUserInfo.picture,
          });
        }
      }

      // Find user
      let user;
      try {
        user = await this.userRepository.findByEmail(email);
        console.log("User lookup result:", user ? "Found" : "Not found");
      } catch (dbError) {
        console.error("Error finding user:", dbError);
        throw new AuthError(
          "Database error while looking up user",
          "auth/database-error"
        );
      }

      // Create user if not found
      if (!user) {
        console.log("Creating new user with email:", email);
        try {
          // Prepare user data - include OAuth info if available
          const userData: { email: string; authProvider?: string } = { email };

          // Prepare profile data
          const profileData: any = {
            email,
            subscriptionTier: "free",
            subscriptionStatus: "inactive",
            monthlyExecutionQuota: 100,
            monthlyExecutionCount: 0,
          };

          // Enhance with OAuth information if available
          if (isOAuth && oauthUserInfo) {
            // Add OAuth provider information
            userData.authProvider = oauthProvider;

            // Add name from OAuth if available
            if (oauthUserInfo.name) {
              profileData.name = oauthUserInfo.name;
            }

            // Add profile picture from OAuth if available
            if (oauthUserInfo.picture) {
              profileData.avatarUrl = oauthUserInfo.picture;
            }

            console.log(`Creating new user with OAuth ${oauthProvider} data`, {
              provider: oauthProvider,
              hasName: !!profileData.name,
              hasAvatar: !!profileData.avatarUrl,
            });
          }

          user = await this.userRepository.createWithProfile(
            userData,
            profileData
          );

          console.log("New user created:", user?.id);
        } catch (createError) {
          console.error("Error creating new user:", createError);
          throw new AuthError(
            "Failed to create new user account",
            "auth/user-creation-failed"
          );
        }
      } else if (isOAuth && oauthUserInfo) {
        // User exists but might need profile updates from OAuth
        try {
          console.log(
            `Updating existing user with OAuth data from ${oauthProvider}`
          );

          // Get user profile
          const profile = await this.prisma.profile.findFirst({
            where: { user: { id: user.id } },
          });

          if (profile) {
            // Only update if fields are empty or missing
            const updates: { fullName?: string; avatarUrl?: string } = {};

            // Add name if not set
            if (
              oauthUserInfo.name &&
              (!profile.fullName || profile.fullName === "")
            ) {
              updates.fullName = oauthUserInfo.name;
            }

            // Add avatar if not set
            if (
              oauthUserInfo.picture &&
              (!profile.avatarUrl || profile.avatarUrl === "")
            ) {
              updates.avatarUrl = oauthUserInfo.picture;
            }

            // Apply updates if needed
            if (Object.keys(updates).length > 0) {
              await this.prisma.profile.update({
                where: { id: profile.id },
                data: updates,
              });
              console.log("Updated user profile with OAuth data", {
                fields: Object.keys(updates),
              });
            }
          }
        } catch (updateError) {
          // Log but don't fail authentication
          console.error(
            "Error updating user profile with OAuth data:",
            updateError
          );
        }
      }

      // Verify user exists before proceeding
      if (!user) {
        console.error("User is null after find/create operations");
        throw new AuthError(
          "User account could not be accessed or created",
          "auth/user-not-found"
        );
      }

      // Create session
      try {
        const result = await this.createSession(user);
        console.log("Session created successfully for user:", user.id);
        return result;
      } catch (sessionError) {
        console.error("Error creating session:", sessionError);
        throw new AuthError(
          "Failed to create authentication session",
          "auth/session-creation-failed"
        );
      }
    } catch (error) {
      console.error("Authentication error:", error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        "Failed to authenticate with Magic Link",
        "auth/magic-link-failed"
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
