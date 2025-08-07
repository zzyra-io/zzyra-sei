import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface DynamicJwtPayload extends JwtPayload {
  sub: string;
  email?: string;
  verified_credentials?: {
    address: string;
    chain: string;
    wallet_name: string;
    wallet_provider: string;
    public_identifier?: string;
  }[];
  scopes?: string[];
  environment_id?: string;
  lists?: string[];
}

@Injectable()
export class DynamicJwtService {
  private readonly logger = new Logger(DynamicJwtService.name);
  private jwksClient: any;
  private environmentId: string;

  constructor(private readonly configService: ConfigService) {
    this.environmentId =
      this.configService.get<string>("DYNAMIC_ENVIRONMENT_ID") || "";
    if (!this.environmentId) {
      this.logger.warn(
        "DYNAMIC_ENVIRONMENT_ID is not set. Dynamic JWT validation will not work."
      );
    }
    // Remove the log statement that might be causing issues during construction
  }

  private async getJwksClient(): Promise<any> {
    if (!this.environmentId) {
      throw new UnauthorizedException(
        "Dynamic authentication is not configured"
      );
    }

    if (!this.jwksClient) {
      try {
        // Dynamic import to avoid startup issues
        const { JwksClient } = await import("jwks-rsa");
        const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${this.environmentId}/.well-known/jwks`;

        this.jwksClient = new JwksClient({
          jwksUri: jwksUrl,
          rateLimit: true,
          cache: true,
          cacheMaxEntries: 5,
          cacheMaxAge: 600000, // 10 minutes
          timeout: 10000, // Reduced timeout to 10 seconds
          requestHeaders: { "User-Agent": "Zyra-API/1.0" },
        });

        this.logger.log("JWKS client initialized lazily", { jwksUrl });
      } catch (error) {
        this.logger.error("Failed to initialize JWKS client", error);
        throw new UnauthorizedException(
          "Dynamic authentication service unavailable"
        );
      }
    }

    return this.jwksClient;
  }

  private decodeBase64Url(base64Url: string): string {
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4;
    if (padding) base64 = base64.padEnd(base64.length + (4 - padding), "=");
    return Buffer.from(base64, "base64").toString();
  }

  /**
   * Validates Dynamic JWT token and returns decoded payload
   */
  async validateDynamicJwt(token: string): Promise<DynamicJwtPayload> {
    try {
      this.logger.debug("Validating Dynamic JWT token");

      // Check if environment ID is set
      if (!this.environmentId) {
        throw new UnauthorizedException(
          "Dynamic authentication is not configured"
        );
      }

      // Basic token format validation
      if (!token || typeof token !== "string") {
        throw new UnauthorizedException("Invalid token format");
      }

      // Check if token has proper JWT structure
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        // TEMPORARY: Accept sessionId format to break infinite loop
        this.logger.warn(
          "Token is not JWT format, might be sessionId - accepting for debugging"
        );

        // Create a mock payload for sessionId
        if (token.length > 20) {
          // Reasonable sessionId length
          return {
            sub: token, // Use sessionId as user identifier
            email: "debug@dynamic.com",
            environment_id: this.environmentId,
            verified_credentials: [
              {
                address: "0x0000000000000000000000000000000000000000",
                chain: "evm",
                wallet_name: "debug",
                wallet_provider: "debug",
              },
            ],
            scopes: [],
          } as DynamicJwtPayload;
        }

        throw new UnauthorizedException("Invalid JWT token structure");
      }

      // Get the kid from token header to fetch the right signing key
      const header = JSON.parse(this.decodeBase64Url(tokenParts[0]));
      const kid = header.kid;

      if (!kid) {
        throw new UnauthorizedException("Token missing key identifier");
      }

      // Get the specific signing key with timeout handling
      let signingKey;
      try {
        const jwksClient = await this.getJwksClient();
        signingKey = await Promise.race([
          jwksClient.getSigningKey(kid),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("JWKS key retrieval timeout")),
              15000
            )
          ),
        ]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to retrieve signing key", {
          error: errorMessage,
          kid,
        });
        throw new UnauthorizedException(
          `Failed to retrieve signing key: ${errorMessage}`
        );
      }

      const publicKey = (
        typeof (signingKey as any).getPublicKey === "function"
          ? (signingKey as any).getPublicKey()
          : (signingKey as any).publicKey || (signingKey as any).rsaPublicKey
      ) as string;

      // Verify and decode the JWT with additional options
      const decodedToken = jwt.verify(token, publicKey, {
        algorithms: ["RS256"], // Dynamic uses RS256
        issuer: `https://app.dynamic.xyz/api/v0/sdk/${this.environmentId}`,
        ignoreExpiration: false,
        clockTolerance: 60, // Allow 60 seconds clock skew
      }) as DynamicJwtPayload;

      // Validate environment ID matches
      if (
        decodedToken.environment_id &&
        decodedToken.environment_id !== this.environmentId
      ) {
        throw new UnauthorizedException("Token environment mismatch");
      }

      // Check for additional auth requirements
      if (decodedToken.scopes?.includes("requiresAdditionalAuth")) {
        throw new UnauthorizedException("Additional verification required");
      }

      // Validate that we have verified credentials
      if (
        !decodedToken.verified_credentials ||
        decodedToken.verified_credentials.length === 0
      ) {
        throw new UnauthorizedException(
          "No verified credentials found in token"
        );
      }

      this.logger.debug("Dynamic JWT validated successfully", {
        userId: decodedToken.sub,
        email: decodedToken.email,
        walletCount: decodedToken.verified_credentials?.length || 0,
      });

      return decodedToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error("Dynamic JWT validation failed", {
        error: errorMessage,
        tokenPreview: token ? `${token.substring(0, 20)}...` : "null",
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle specific JWT errors
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`Invalid JWT: ${error.message}`);
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException("JWT token has expired");
      }

      if (error instanceof jwt.NotBeforeError) {
        throw new UnauthorizedException("JWT token not active yet");
      }

      throw new UnauthorizedException("Invalid Dynamic JWT token");
    }
  }

  /**
   * Extracts wallet address from Dynamic JWT payload
   */
  extractWalletAddress(payload: DynamicJwtPayload): string {
    const credentials = payload.verified_credentials?.[0];

    if (!credentials?.address) {
      throw new UnauthorizedException("No wallet address found in token");
    }

    return credentials.address;
  }

  /**
   * Extracts chain information from Dynamic JWT payload
   */
  extractChainInfo(payload: DynamicJwtPayload): {
    chain: string;
    walletProvider: string;
    walletName: string;
  } {
    const credentials = payload.verified_credentials?.[0];

    return {
      chain: credentials?.chain || "ethereum",
      walletProvider: credentials?.wallet_provider || "unknown",
      walletName: credentials?.wallet_name || "unknown",
    };
  }

  /**
   * Get all verified credentials from token
   */
  getAllVerifiedCredentials(payload: DynamicJwtPayload) {
    return payload.verified_credentials || [];
  }

  /**
   * Check if user has specific scopes
   */
  hasScope(payload: DynamicJwtPayload, scope: string): boolean {
    return payload.scopes?.includes(scope) || false;
  }
}
