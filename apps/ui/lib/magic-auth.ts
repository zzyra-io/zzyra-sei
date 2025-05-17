/**
 * Magic Link Authentication
 *
 * Simple wrapper around the Magic SDK that follows the official documentation.
 */

import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";
import { OAuthProvider } from "./magic-auth-types";

// Re-export types for convenience
import type { MagicUserMetadata } from "magic-sdk";
export type { MagicUserMetadata };

/**
 * Configuration for Magic Auth
 */
export interface MagicAuthConfig {
  magicPublishableKey: string;
}

/**
 * MagicAuth Class
 *
 * Minimal wrapper around the Magic SDK
 */
export class MagicAuth {
  private magic;

  constructor(config: MagicAuthConfig) {
    if (!config.magicPublishableKey) {
      throw new Error("Magic API key is required");
    }

    // Initialize Magic with required extensions
    this.magic = new Magic(config.magicPublishableKey, {
      extensions: [new OAuthExtension()],
    });

    console.log("Magic initialized with OAuth extension");
  }

  /**
   * Get Magic instance
   */
  getMagic() {
    return this.magic;
  }

  /**
   * Get user metadata
   */
  async getUserInfo() {
    return this.magic.user.getInfo();
  }

  /**
   * Login with email
   */
  async loginWithEmail(email: string): Promise<void> {
    await this.magic.auth.loginWithMagicLink({
      email,
      showUI: true,
    });
  }
  
  /**
   * Login with SMS (phone number)
   */
  async loginWithSMS(phoneNumber: string): Promise<string | null> {
    try {
      console.log(`MagicAuth: Starting SMS login for ${phoneNumber}`);
      
      // Time out after 60 seconds
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("SMS login timed out")), 60000);
      });
      
      // Configure SMS login options
      const smsLoginOptions = {
        phoneNumber,
        showUI: true,
      };
      
      // Race against timeout
      const didToken = await Promise.race([
        this.magic.auth.loginWithSMS(smsLoginOptions),
        timeoutPromise,
      ]);
      
      console.log("MagicAuth: Successfully authenticated with Magic via SMS");
      return didToken;
    } catch (error) {
      console.error("MagicAuth: Login with SMS failed:", error);
      throw error;
    }
  }

  /**
   * Login with OAuth provider (Google, Apple, etc.)
   */
  async loginWithOAuth(provider: OAuthProvider): Promise<void> {
    try {
      console.log(`MagicAuth: Logging in with OAuth provider ${provider}`);

      // Magic OAuth extension is exposed as oauth2 not oauth
      console.log("Magic instance properties:", Object.keys(this.magic));
      console.log("OAuth extension:", this.magic.oauth2);

      if (!this.magic.oauth2) {
        throw new Error(
          "OAuth extension not initialized properly - oauth2 property missing"
        );
      }

      await this.magic.oauth2.loginWithRedirect({
        provider,
        redirectURI:
          "https://auth.magic.link/v1/oauth2/2RZJeTIaH2Q7lLWycJ3PZ5WjAM53Q4rL7VZlfxSxlRo=/callback",
        loginHint: "",
      });

      console.log(`MagicAuth: OAuth redirect initiated for ${provider}`);
    } catch (error) {
      console.error(`MagicAuth: OAuth login failed with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback() {
    if (!this.magic.oauth2) {
      throw new Error(
        "OAuth extension not initialized properly - oauth2 property missing"
      );
    }
    return this.magic.oauth2.getRedirectResult({});
  }

  /**
   * Logout user
      // Race against timeout
      const didToken = await Promise.race([
        this.magic.auth.loginWithSMS(smsLoginOptions),
        timeoutPromise,
      ]);

      console.log(
        "MagicAuth: Successfully authenticated with Magic via SMS, got DID token"
      );
      return didToken;
    } catch (error) {
      console.error("MagicAuth: Login with SMS failed:", error);
      if (
        error instanceof RPCError &&
        error.code === RPCErrorCode.UserAlreadyLoggedIn
      ) {
        console.warn("MagicAuth: User already logged in with Magic.");
        // Try to get a DID token anyway for the session
        try {
          return await this.generateDIDToken();
        } catch (tokenError) {
          console.error(
            "Failed to generate token for logged-in user:",
            tokenError
          );
        }
      }
      throw error;
    }
  }

  /**
   * Check if user is logged in with Magic.
   *
   * @returns True if logged in, false otherwise
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      console.log("MagicAuth: Checking if user is logged in...");
      const isLoggedIn = await this.magic.user.isLoggedIn();
      console.log(`MagicAuth: User is ${isLoggedIn ? "" : "not "} logged in`);
      return isLoggedIn;
    } catch (error) {
      console.error("MagicAuth: Error checking if user is logged in:", error);
      return false;
    }
  }

  /**
   * Logs the user out from Magic.
   * Application-level session (NextAuth) logout should be handled separately.
   */
  async logout(): Promise<void> {
    try {
      console.log("MagicAuth: Logging out from Magic...");
      if (await this.magic.user.isLoggedIn()) {
        await this.magic.user.logout();
        console.log("MagicAuth: Successfully logged out from Magic.");
      } else {
        console.log(
          "MagicAuth: User not logged in to Magic, no Magic logout needed."
        );
      }
    } catch (error) {
      console.error("MagicAuth: Magic logout failed:", error);
    }
  }

  /**
   * Retrieves the current logged-in user's metadata from Magic.
   */
  async getUserMetadata(): Promise<MagicUserMetadata | null> {
    try {
      if (await this.magic.user.isLoggedIn()) {
        return await this.magic.user.getInfo();
      }
      return null;
    } catch (error) {
      console.error(
        "MagicAuth: Error fetching user metadata from Magic:",
        error
      );
      return null;
    }
  }

  /**
   * Get the Magic instance
   */
  getMagicInstance() {
    return this.magic;
  }

  /**
   * Generate a DID token for authentication with backend
   * This is used for authenticating with the Prisma backend
   *
   * @param lifespan Optional lifespan for the token in seconds (default: 7 days)
   * @returns DID token string if successful, null otherwise
   */
  async generateDIDToken(lifespan = 60 * 60 * 24 * 7): Promise<string | null> {
    try {
      console.log("MagicAuth: Generating DID token...");
      const didToken = await this.magic.user.generateIdToken({ lifespan });
      console.log("MagicAuth: Successfully generated DID token");
      return didToken;
    } catch (error) {
      console.error("MagicAuth: Failed to generate DID token:", error);
      return null;
    }
  }
}

let magicAuthInstance: MagicAuth | null = null;

export const createMagicAuth = (): MagicAuth => {
  if (magicAuthInstance) {
    console.log("magicAuthInstance", magicAuthInstance);
    return magicAuthInstance;
  }

  const magicPublishableKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  if (!magicPublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY in environment. This is required to initialize Magic SDK."
    );
  }

  const config: MagicAuthConfig = {
    magicPublishableKey,
  };

  magicAuthInstance = new MagicAuth(config);
  return magicAuthInstance;
};
