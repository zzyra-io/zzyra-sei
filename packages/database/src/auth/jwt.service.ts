/**
 * JWT Service
 *
 * This service handles JWT token generation, verification, and management.
 * It provides a secure authentication mechanism for the Zyra platform.
 */

import * as jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './types';
import prisma from '../client';

// Define RefreshToken interface until Prisma generates it
interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class JwtService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: number; // In days

  constructor() {
    this.JWT_SECRET =
      process.env.JWT_SECRET || "your-jwt-secret-key-change-in-production";
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
    this.REFRESH_TOKEN_EXPIRES_IN = parseInt(
      process.env.REFRESH_TOKEN_EXPIRES_IN || "7",
      10
    );
  }

  /**
   * Generate a JWT token for a user
   * @param payload The JWT payload
   * @returns The signed JWT token
   */
  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.JWT_SECRET as Secret, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as SignOptions);
  }

  /**
   * Verify a JWT token
   * @param token The JWT token to verify
   * @returns The decoded payload or null if invalid
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
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
    
    // Delete any existing refresh tokens for this user
    await prisma.$executeRaw`DELETE FROM refresh_tokens WHERE user_id = ${userId}`;
    
    // Create new refresh token with raw SQL until Prisma client is regenerated
    const result = await prisma.$executeRaw`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at, updated_at)
      VALUES (${uuidv4()}, ${userId}, ${token}, ${expiresAt}, NOW(), NOW())
      RETURNING id, user_id, token, expires_at, created_at, updated_at
    `;
    
    // Return a structured refresh token object
    return {
      id: uuidv4(), // This will be different from the actual DB ID until client is regenerated
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Verify a refresh token
   * @param token The refresh token to verify
   * @returns The refresh token data or null if invalid
   */
  async verifyRefreshToken(token: string): Promise<RefreshToken | null> {
    // Query refresh token using raw SQL
    const tokens = await prisma.$queryRaw<RefreshToken[]>`
      SELECT id, user_id as "userId", token, expires_at as "expiresAt", 
             created_at as "createdAt", updated_at as "updatedAt"
      FROM refresh_tokens
      WHERE token = ${token}
      LIMIT 1
    `;
    
    const refreshToken = tokens && tokens.length > 0 ? tokens[0] : null;
    if (!refreshToken) return null;

    // Check if the token has expired
    if (new Date() > refreshToken.expiresAt) {
      // Delete the expired token
      await prisma.$executeRaw`DELETE FROM refresh_tokens WHERE id = ${refreshToken.id}`;
      return null;
    }

    return refreshToken;
  }

  /**
   * Refresh a JWT token using a refresh token
   * @param token The refresh token
   * @returns The new JWT token and refresh token or null if invalid
   */
  async refreshToken(token: string): Promise<{ token: string; refreshToken: RefreshToken } | null> {
    const verifiedToken = await this.verifyRefreshToken(token);
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

    const newToken = this.generateToken(payload);

    // Generate a new refresh token
    const newRefreshToken = await this.generateRefreshToken(user.id);

    // Delete the old refresh token
    await prisma.$executeRaw`DELETE FROM refresh_tokens WHERE id = ${verifiedToken.id}`;

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Invalidate all refresh tokens for a user
   * @param userId The user ID
   */
  async invalidateAllTokens(userId: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM refresh_tokens WHERE user_id = ${userId}`;
  }
}
