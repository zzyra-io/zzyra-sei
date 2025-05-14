/**
 * JWT Service
 * 
 * This service handles JWT token generation, verification, and management.
 * It provides a secure authentication mechanism for the Zyra platform.
 */

import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload, RefreshToken } from './types';
import prisma from '../client';

export class JwtService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: number; // In days

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
    this.REFRESH_TOKEN_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '7', 10);
  }

  /**
   * Generate a JWT token for a user
   * @param payload The JWT payload
   * @returns The signed JWT token
   */
  generateToken(payload: JwtPayload): string {
    return sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  /**
   * Verify a JWT token
   * @param token The JWT token to verify
   * @returns The decoded payload or null if invalid
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      return verify(token, this.JWT_SECRET) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a refresh token for a user
   * @param userId The user ID
   * @returns The refresh token data
   */
  async generateRefreshToken(userId: string): Promise<RefreshToken> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRES_IN);

    // Store the refresh token in the database
    return prisma.$transaction(async (tx: typeof prisma) => {
      // Delete any existing refresh tokens for this user (optional)
      await tx.refreshToken.deleteMany({
        where: { userId },
      });

      // Create a new refresh token
      return tx.refreshToken.create({
        data: {
          userId,
          token,
          expiresAt,
        },
      });
    });
  }

  /**
   * Verify a refresh token
   * @param token The refresh token to verify
   * @returns The refresh token data or null if invalid
   */
  async verifyRefreshToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await prisma.refreshToken.findFirst({
      where: { token },
    });

    if (!refreshToken) return null;

    // Check if the token has expired
    if (new Date() > refreshToken.expiresAt) {
      // Delete the expired token
      await prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      return null;
    }

    return refreshToken;
  }

  /**
   * Refresh a JWT token using a refresh token
   * @param refreshToken The refresh token
   * @returns The new JWT token and refresh token or null if invalid
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: RefreshToken } | null> {
    const verifiedToken = await this.verifyRefreshToken(refreshToken);
    if (!verifiedToken) return null;

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: verifiedToken.userId },
    });

    if (!user) return null;

    // Generate a new JWT token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email || undefined,
    };

    const token = this.generateToken(payload);

    // Generate a new refresh token
    const newRefreshToken = await this.generateRefreshToken(user.id);

    // Delete the old refresh token
    await prisma.refreshToken.delete({
      where: { id: verifiedToken.id },
    });

    return {
      token,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Invalidate all refresh tokens for a user
   * @param userId The user ID
   */
  async invalidateAllTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
