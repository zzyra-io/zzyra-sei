/**
 * User Repository
 *
 * This repository provides database operations for users.
 * It handles user management, authentication, and profile operations.
 */

import { Prisma, User, Profile, UserWallet } from "@prisma/client";
import { BaseRepository } from "./base.repository";

// Type definitions for user operations
export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;
export type UserWithProfile = User & {
  profile: Profile | null;
};
export type UserWithWallets = User & {
  userWallets: UserWallet[];
};
export type UserWithProfileAndWallets = User & {
  profile: Profile | null;
  userWallets: UserWallet[];
};

export class UserRepository extends BaseRepository<
  User,
  UserCreateInput,
  UserUpdateInput
> {
  protected tableName = "users";
  protected model = this.prisma.user;

  /**
   * Find a user by email
   * @param email The email to find
   * @returns The user or null
   */
  async findByEmail(email: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findFirst({
      where: { email },
      include: {
        profile: true,
      },
    });
  }

  /**
   * Find a user by wallet address
   * @param walletAddress The wallet address to find
   * @returns The user or null
   */
  async findByWalletAddress(
    walletAddress: string
  ): Promise<UserWithWallets | null> {
    const wallet = await this.prisma.userWallet.findFirst({
      where: { walletAddress },
      include: {
        user: true,
      },
    });

    if (!wallet) return null;

    return this.prisma.user.findUnique({
      where: { id: wallet.userId },
      include: {
        userWallets: true,
      },
    });
  }

  /**
   * Find a user with profile and wallets
   * @param userId The user ID
   * @returns The user with profile and wallets or null
   */
  async findWithProfileAndWallets(
    userId: string
  ): Promise<UserWithProfileAndWallets | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userWallets: true,
      },
    });
  }

  /**
   * Create a user with profile
   * @param userData The user data
   * @param profileData The profile data
   * @returns The created user with profile
   */
  async createWithProfile(
    userData: Omit<UserCreateInput, "profile">,
    profileData: Omit<Prisma.ProfileCreateInput, "user">
  ): Promise<UserWithProfile> {
    return this.prisma.user.create({
      data: {
        ...userData,
        profile: {
          create: profileData,
        },
      },
      include: {
        profile: true,
      },
    });
  }

  /**
   * Update a user's profile
   * @param userId The user ID
   * @param profileData The profile data to update
   * @returns The updated user with profile
   */
  async updateProfile(
    userId: string,
    profileData: Omit<Prisma.ProfileUpdateInput, "user">
  ): Promise<UserWithProfile> {
    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (profile) {
      // Update existing profile
      await this.prisma.profile.update({
        where: { id: userId },
        data: profileData,
      });
    } else {
      // Create new profile
      await this.prisma.profile.create({
        data: {
          id: userId,
          ...(profileData as any),
        },
      });
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    }) as Promise<UserWithProfile>;
  }

  /**
   * Add a wallet to a user
   * @param userId The user ID
   * @param walletData The wallet data
   * @returns The created wallet
   */
  async addWallet(
    userId: string,
    walletData: Omit<Prisma.UserWalletCreateInput, "user">
  ): Promise<UserWallet> {
    return this.prisma.userWallet.create({
      data: {
        ...walletData,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  /**
   * Update user's last seen timestamp
   * @param userId The user ID
   * @returns The updated profile
   */
  async updateLastSeen(userId: string): Promise<Profile | null> {
    return this.prisma.profile.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
      },
    });
  }
}
