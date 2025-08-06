import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

export interface DynamicJwtPayload extends JwtPayload {
  sub: string;
  email?: string;
  verified_credentials?: {
    address: string;
    chain: string;
    wallet_name: string;
    wallet_provider: string;
  }[];
  scopes?: string[];
}

@Injectable()
export class DynamicJwtService {
  private readonly logger = new Logger(DynamicJwtService.name);
  private jwksClient: JwksClient;

  constructor(private readonly configService: ConfigService) {
    const environmentId = this.configService.get<string>(
      "DYNAMIC_ENVIRONMENT_ID"
    );

    if (!environmentId) {
      throw new Error("DYNAMIC_ENVIRONMENT_ID is required");
    }

    // Initialize JWKS client for Dynamic
    const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${environmentId}/.well-known/jwks`;

    this.jwksClient = new JwksClient({
      jwksUri: jwksUrl,
      rateLimit: true,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });

    this.logger.log("Dynamic JWT Service initialized");
  }

  /**
   * Validates Dynamic JWT token and returns decoded payload
   */
  async validateDynamicJwt(token: string): Promise<DynamicJwtPayload> {
    try {
      this.logger.debug("Validating Dynamic JWT token");

      // Get the signing key from JWKS
      const signingKey = await this.jwksClient.getSigningKey();
      const publicKey = signingKey.getPublicKey();

      // Verify and decode the JWT
      const decodedToken = jwt.verify(token, publicKey, {
        ignoreExpiration: false,
      }) as DynamicJwtPayload;

      // Check for additional auth requirements
      if (decodedToken.scopes?.includes("requiresAdditionalAuth")) {
        throw new UnauthorizedException("Additional verification required");
      }

      this.logger.debug("Dynamic JWT validated successfully", {
        userId: decodedToken.sub,
        email: decodedToken.email,
      });

      return decodedToken;
    } catch (error) {
      this.logger.error("Dynamic JWT validation failed", {
        error: error.message,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
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
  } {
    const credentials = payload.verified_credentials?.[0];

    return {
      chain: credentials?.chain || "ethereum",
      walletProvider: credentials?.wallet_provider || "unknown",
    };
  }
}
