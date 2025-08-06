import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  HttpCode,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { JwtService } from "@nestjs/jwt";
import { Public } from "./decorators/public.decorator";
import { DynamicJwtService } from "./dynamic-jwt.service";
import { PrismaService } from "../database/prisma.service";

interface DynamicAuthPayload {
  email?: string;
  authToken: string; // Dynamic JWT token
}

interface AuthResponseDto {
  success: boolean;
  user: {
    id: string;
    email: string;
    walletAddress: string;
    chainId: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
  callbackUrl?: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly dynamicJwtService: DynamicJwtService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "User login with Dynamic wallet",
    description:
      "Authenticate user using Dynamic JWT token from wallet connection",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        authToken: { type: "string", description: "Dynamic JWT token" },
        callbackUrl: { type: "string" },
      },
      required: ["authToken"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Authentication successful",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        user: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            walletAddress: { type: "string" },
            chainId: { type: "string" },
          },
        },
        session: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            expiresAt: { type: "string", format: "date-time" },
          },
        },
        callbackUrl: { type: "string" },
      },
    },
  })
  async login(
    @Body() body: DynamicAuthPayload & { callbackUrl?: string }
  ): Promise<AuthResponseDto> {
    try {
      const { authToken, callbackUrl, email } = body;

      if (!authToken) {
        throw new HttpException(
          "Dynamic auth token is required",
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log("Processing Dynamic authentication", {
        hasToken: !!authToken,
        hasEmail: !!email,
        callbackUrl,
      });

      // Step 1: Validate Dynamic JWT token
      const dynamicPayload =
        await this.dynamicJwtService.validateDynamicJwt(authToken);

      // Step 2: Extract wallet and user information
      const walletAddress =
        this.dynamicJwtService.extractWalletAddress(dynamicPayload);
      const { chain, walletProvider } =
        this.dynamicJwtService.extractChainInfo(dynamicPayload);
      const userEmail = email || dynamicPayload.email;

      this.logger.log("Dynamic token validated", {
        userId: dynamicPayload.sub,
        walletAddress,
        chain,
        walletProvider,
      });

      // Step 3: Find or create user based on wallet address or email
      let user = await this.prismaService.client.user.findFirst({
        where: {
          OR: [
            ...(userEmail ? [{ email: userEmail }] : []),
            {
              userWallets: {
                some: { walletAddress },
              },
            },
          ],
        },
        include: {
          userWallets: true,
          profile: true,
        },
      });

      if (!user) {
        // Create new user with wallet
        user = await this.prismaService.client.user.create({
          data: {
            email: userEmail || `${walletAddress}@dynamic.wallet`,
            userWallets: {
              create: {
                walletAddress,
                chainId: chain,
                walletType: "dynamic",
                chainType: "evm",
                metadata: {
                  walletProvider,
                  dynamicUserId: dynamicPayload.sub,
                  dynamicPayload: {
                    sub: dynamicPayload.sub,
                    verified_credentials: dynamicPayload.verified_credentials,
                  },
                },
              },
            },
          },
          include: {
            userWallets: true,
            profile: true,
          },
        });

        this.logger.log("Created new user from Dynamic auth", {
          userId: user.id,
          walletAddress,
        });
      } else {
        // Update user and ensure wallet is linked
        const existingWallet = user.userWallets.find(
          (w) => w.walletAddress === walletAddress
        );

        if (!existingWallet) {
          await this.prismaService.client.userWallet.create({
            data: {
              userId: user.id,
              walletAddress,
              chainId: chain,
              walletType: "dynamic",
              chainType: "evm",
              metadata: {
                walletProvider,
                dynamicUserId: dynamicPayload.sub,
                dynamicPayload: {
                  sub: dynamicPayload.sub,
                  verified_credentials: dynamicPayload.verified_credentials,
                },
              },
            },
          });
        }

        // Update user's last activity
        user = await this.prismaService.client.user.update({
          where: { id: user.id },
          data: {
            updatedAt: new Date(),
          },
          include: {
            userWallets: true,
            profile: true,
          },
        });

        this.logger.log("Updated existing user with Dynamic auth", {
          userId: user.id,
          walletAddress,
        });
      }

      // Step 4: Generate JWT tokens for session
      const primaryWallet =
        user.userWallets.find((w) => w.walletAddress === walletAddress) ||
        user.userWallets[0];

      const tokenPayload = {
        sub: user.id,
        email: user.email,
        walletAddress: primaryWallet?.walletAddress,
        chainId: primaryWallet?.chainId,
        dynamicUserId: dynamicPayload.sub,
      };

      const accessToken = this.jwtService.sign(tokenPayload, {
        expiresIn: "1h",
      });
      const refreshToken = this.jwtService.sign(tokenPayload, {
        expiresIn: "7d",
      });
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      this.logger.log("Dynamic authentication successful", {
        userId: user.id,
        walletAddress: primaryWallet?.walletAddress,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email || "",
          walletAddress: primaryWallet?.walletAddress || "",
          chainId: primaryWallet?.chainId || chain,
        },
        session: {
          accessToken,
          refreshToken,
          expiresAt,
        },
        callbackUrl,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error("Dynamic authentication failed", {
        error: errorMessage,
        stack: errorStack,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new HttpException(
        `Authentication failed: ${errorMessage}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User logout" })
  async logout(@Body() body: { refreshToken?: string }) {
    try {
      // For now, we just return success since we don't have persistent sessions
      // In the future, we could implement token blacklisting or session management
      this.logger.log("User logout request", {
        hasRefreshToken: !!body.refreshToken,
      });

      return { success: true, message: "Logged out successfully" };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Logout failed", errorMessage);
      return { success: true, message: "Logged out successfully" }; // Always succeed
    }
  }
}
