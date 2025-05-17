/**
 * Magic Link Authentication Layer
 *
 * This file provides an abstraction over the Magic SDK for handling various authentication flows.
 * It is NOT responsible for application-level session management or database interactions.
 */

// import { Wallet, WalletType, ChainType } from "@zyra/wallet"; // Commented out as mapMagicUserToWallet is commented out
import { OAuthProvider } from "./magic-auth-types";
import {
  Magic,
  MagicUserMetadata,
  RPCError,
  RPCErrorCode,
  LoginWithMagicLinkConfiguration,
  LoginWithSmsConfiguration,
} from "magic-sdk";
import {
  OAuthExtension,
  OAuthRedirectConfiguration,
  OAuthRedirectResult,
} from "@magic-ext/oauth2";
import { WebAuthnExtension } from "@magic-ext/webauthn";
// Import locally defined types

// Removed: import { SupabaseClient, createClient } from "@supabase/supabase-js";

/**
 * Configuration for MagicAuth
 */
export interface MagicAuthConfig {
  magicPublishableKey: string;
  storage?: unknown;
}

/* // Commenting out mapMagicUserToWallet as it's not used in this file after Supabase removal
// This function might be moved or adapted if Wallet type is no longer directly constructed here.
// For now, keeping its signature but noting its dependency on @zyra/wallet types.
function mapMagicUserToWallet(
  user: MagicUserMetadata | null,
  publicAddress?: string | null
): Partial<Wallet> { // Returning Partial<Wallet> as appUserId won't be known here
  const walletAddressStr = publicAddress || user?.publicAddress || "";

  return {
    // id: user?.issuer || walletAddressStr, // ID might be DB generated later
    // userId: "", // appUserId is not known by this pure Magic wrapper
    walletAddress: walletAddressStr,
    // chainId: "1", // Default or placeholder, might be set later
    // walletType: WalletType.MAGIC, // Or determine more specifically
    // chainType: ChainType.ETHEREUM, // Default or placeholder
    // createdAt: new Date(), // DB responsibility
    // updatedAt: new Date(), // DB responsibility
    metadata: user || undefined,
    email: user?.email,
    // Other fields like isPrimary, phoneNumber would be set based on context elsewhere
  };
}
*/

/**
 * Manages authentication with Magic SDK
 */
export class MagicAuth {
  private magic: Magic<[OAuthExtension, WebAuthnExtension]>;
  private config: MagicAuthConfig;
  // Removed OAUTH_PKCE_VERIFIER_STORAGE_KEY and MAGIC_CREDENTIAL_STORAGE_KEY unless needed solely by Magic client

  /**
   * Constructor
   */
  constructor(config: MagicAuthConfig) {
    this.config = config;

    // Log the config being used (redact the key)
    console.log("MagicAuth: Initializing with config:", {
      keyAvailable: !!config.magicPublishableKey,
      keyPrefix: config.magicPublishableKey
        ? config.magicPublishableKey.substring(0, 5) + "..."
        : "none",
    });

    try {
      this.magic = new Magic(config.magicPublishableKey, {
        extensions: [new OAuthExtension(), new WebAuthnExtension()],
      });
      console.log("MagicAuth: Magic SDK initialized successfully");
    } catch (error) {
      console.error("MagicAuth: Failed to initialize Magic SDK:", error);
      throw error;
    }
  }

  /**
   * Login with Magic Link (email)
   *
   * @param email User's email address
   * @returns DID Token string if successful, null otherwise
   */
  async loginWithMagicLink(
    email: string,
    options?: LoginWithMagicLinkConfiguration
  ): Promise<string | null> {
    try {
      console.log(
        `MagicAuth: Attempting login with Magic Link for email: ${email}`
      );

      // Configure login options according to Magic docs
      const loginOptions = {
        email,
        showUI: true, // Show Magic UI for better UX
        redirectURI: window.location.origin + "/callback", // Ensure redirect works properly
        ...(options || {}),
      };

      // Race against timeout
      const didToken = await this.magic.auth.loginWithMagicLink(loginOptions);

      console.log("MagicAuth: Successfully received DID token from Magic");
      return didToken;
    } catch (error) {
      console.error("MagicAuth: Login with Magic Link failed:", error);
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
   * Login with OAuth provider (Google, Apple, etc.)
   *
   * @param provider OAuth provider name
   */
  async loginWithOAuth(provider: OAuthProvider): Promise<void> {
    console.log(
      `MagicAuth: Attempting to login with OAuth provider: ${provider}`
    );

    try {
      // Configure OAuth login options according to Magic docs
      const magicLoginOptions: OAuthRedirectConfiguration = {
        provider: provider,
        redirectURI: window.location.origin + "/callback", // Make sure callback route exists
      };

      // Start the OAuth flow with redirect
      await this.magic.oauth2.loginWithRedirect(magicLoginOptions);
      console.log(`MagicAuth: Redirecting to ${provider} OAuth flow...`);
    } catch (error: unknown) {
      console.error(`MagicAuth: OAuth login with ${provider} failed:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to start OAuth login with ${provider}: ${errorMessage}`
      );
    }
  }

  /**
   * Handle OAuth redirect callback from Magic.
   *
   * @returns OAuth result from Magic SDK
   */
  async handleOAuthCallback(): Promise<OAuthRedirectResult> {
    try {
      console.log(`MagicAuth: Processing OAuth callback...`);
      const result: OAuthRedirectResult =
        await this.magic.oauth2.getRedirectResult({});
      console.log(
        "MagicAuth: Successfully received OAuth result from Magic",
        result
      );
      return result;
    } catch (error) {
      console.error("MagicAuth: OAuth callback handling failed:", error);
      throw error;
    }
  }

  /**
   * Login with SMS
   *
   * @param phoneNumber User's phone number
   * @returns DID token after successful authentication
   */
  async loginWithSMS(
    phoneNumber: string,
    options?: LoginWithSmsConfiguration
  ): Promise<string | null> {
    try {
      console.log("MagicAuth: Starting SMS authentication for:", phoneNumber);

      // Set a timeout to avoid indefinite waiting
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("SMS authentication timed out")),
          60000
        ); // 1 minute timeout
      });

      // Configure SMS login options
      const smsLoginOptions: LoginWithSmsConfiguration = {
        phoneNumber,
        showUI: true, // Show Magic UI for better UX
        ...(options || {}),
      };

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
  getMagicInstance(): Magic<[OAuthExtension, WebAuthnExtension]> {
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
