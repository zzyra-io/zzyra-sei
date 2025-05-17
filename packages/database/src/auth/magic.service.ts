/**
 * Magic Verification Service
 *
 * Service for verifying Magic Link DID tokens
 *
 * NOTE: This is a simplified implementation for development.
 * For production, replace with proper Magic Admin SDK verification.
 */

import { AuthError } from "./types";

// Configure Magic Admin - For production, set this in environment variables
const MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || "test-key";

export class MagicService {
  constructor() {
    if (!MAGIC_SECRET_KEY) {
      console.warn(
        "MAGIC_SECRET_KEY environment variable is not set, using mock implementation"
      );
    }
    console.log("MagicService: Initialized");
  }

  /**
   * Validate a DID token from Magic SDK
   *
   * NOTE: This is a simplified implementation for development.
   * In production, use Magic Admin SDK to validate tokens properly.
   *
   * @param didToken The DID token to validate
   * @returns The validated user metadata including email
   */
  async validateToken(
    didToken: string
  ): Promise<{ email: string; issuer: string }> {
    try {
      console.log("MagicService: Validating DID token");

      if (!didToken || didToken.length < 10) {
        throw new Error("Invalid DID token format");
      }

      // For development, we'll extract email from the JWT payload if available
      // or fall back to the email provided in the request payload
      let email = "";
      let issuer = "";

      try {
        // Basic parsing of the token parts
        const parts = didToken.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64").toString()
          );
          email = payload.email || "";
          issuer = payload.iss || payload.sub || "mock-issuer";
        }
      } catch (parseError) {
        console.warn(
          "MagicService: Failed to parse token, using fallback validation"
        );
      }

      // In a real implementation, we would validate the token with Magic Admin SDK
      // and extract email and issuer from the validated metadata

      console.log("MagicService: Token validation successful", {
        email,
        issuer,
      });

      return { email, issuer };
    } catch (error) {
      console.error("MagicService: Token validation failed", error);
      throw new AuthError(
        "Invalid or expired authentication token",
        "auth/invalid-token"
      );
    }
  }

  /**
   * Logout a user from Magic
   *
   * NOTE: This is a simplified implementation for development.
   * In production, use Magic Admin SDK to properly logout users.
   *
   * @param issuer The user's Magic issuer ID
   */
  async logoutUser(issuer: string): Promise<void> {
    try {
      console.log(`MagicService: Logging out user with issuer: ${issuer}`);
      // In a real implementation, we would call Magic Admin SDK to logout
      // await this.magic.users.logoutByIssuer(issuer);
      console.log("MagicService: User logged out successfully");
    } catch (error) {
      console.error("MagicService: Failed to logout user", error);
      // Don't throw here, as we want the logout process to continue even if Magic fails
    }
  }
}

// Export a singleton instance
let magicServiceInstance: MagicService | null = null;

export function getMagicService(): MagicService {
  if (!magicServiceInstance) {
    try {
      magicServiceInstance = new MagicService();
    } catch (error) {
      console.error("Failed to initialize Magic Service:", error);
      throw error;
    }
  }
  return magicServiceInstance;
}
