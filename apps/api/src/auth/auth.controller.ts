import {
  Controller,
  Post,
  Body,
  Request,
  Response,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { JwtService } from "@nestjs/jwt";
import { AuthService as DatabaseAuthService } from "@zyra/database";
import { Public } from "./decorators/public.decorator";

interface MagicAuthPayload {
  email: string;
  didToken: string;
  isOAuth?: boolean;
  oauthProvider?: string;
  oauthUserInfo?: any;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: DatabaseAuthService,
    private readonly jwtService: JwtService
  ) {}

  @Public()
  @Post("login")
  @ApiOperation({ summary: "User login with Magic Link" })
  async login(
    @Body()
    body: {
      email: string;
      didToken: string;
      isOAuth?: boolean;
      oauthProvider?: string;
      oauthUserInfo?: any;
      callbackUrl?: string;
    },
    @Request() req: any,
    @Response() res: any
  ) {
    try {
      const {
        email,
        didToken,
        isOAuth,
        oauthProvider,
        oauthUserInfo,
        callbackUrl,
      } = body;

      if (!email || !didToken) {
        throw new HttpException(
          "Email and DID token are required",
          HttpStatus.BAD_REQUEST
        );
      }

      console.log("Login route: Received authentication data", {
        email,
        didToken: didToken ? "[PRESENT]" : "[MISSING]",
        isOAuth,
        oauthProvider,
        hasOAuthUserInfo: !!oauthUserInfo,
        callbackUrl,
      });

      // Create Magic Auth payload - match the exact structure from Next.js
      const magicPayload: MagicAuthPayload = {
        email,
        didToken,
        isOAuth,
        oauthProvider,
        oauthUserInfo,
      };

      const { session, user } =
        await this.authService.authenticateWithMagic(magicPayload);

      console.log("Auth Result:", { user, session });

      if (!session || !session.accessToken || !user) {
        console.error(
          "Login route: Authentication successful but no session tokens or user returned"
        );
        throw new HttpException(
          "Authentication failed: Invalid session",
          HttpStatus.UNAUTHORIZED
        );
      }

      // Create JWT token structure matching Next.js implementation
      const tokenPayload = {
        sub: user.id,
        email: user.email || "",
        name: user.email ? user.email.split("@")[0] : "User",
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      };

      // Create session token using NestJS JWT service
      const sessionToken = this.jwtService.sign(tokenPayload, {
        expiresIn: "30d", // Match Next.js behavior
      });

      console.log("Created Session Token");

      // Set cookies matching Next.js behavior
      const cookieName =
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token";

      // Set session cookie
      res.cookie(cookieName, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Set access token cookie
      res.cookie("token", session.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 1000, // 1 day
      });

      // Set refresh token cookie if available
      if (session.refreshToken) {
        res.cookie("refresh_token", session.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
        });
      }

      // Clean callbackUrl matching Next.js logic
      let finalCallbackUrl = "/dashboard";
      try {
        if (callbackUrl) {
          const url = new URL(
            callbackUrl,
            req.headers.origin || "http://localhost:3000"
          );
          if (!url.pathname.startsWith("/login")) {
            finalCallbackUrl = url.toString();
          }
        }
      } catch {
        // Use default if invalid
      }

      // Return response matching Next.js format exactly
      return res.json({
        session: {
          expiresAt: session.expiresAt,
          user: {
            id: user.id,
            email: user.email,
            name: user.email ? user.email.split("@")[0] : "User",
          },
        },
        user,
        success: true,
        callbackUrl: finalCallbackUrl,
      });
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      throw new HttpException(errorMessage, HttpStatus.UNAUTHORIZED);
    }
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "User logout" })
  async logout(@Request() req: any, @Response() res: any) {
    try {
      // Clear all cookies matching Next.js logout behavior
      res.clearCookie("token");
      res.clearCookie("refresh_token");
      res.clearCookie("next-auth.session-token");
      res.clearCookie("__Secure-next-auth.session-token");

      // Invalidate tokens in the auth service
      try {
        const token = req.cookies?.token;
        if (token) {
          const userId = this.authService.verifySession(token);
          if (userId) {
            await this.authService.signOut(userId);
            console.log(`Logged out user with ID: ${userId}`);
          }
        }
      } catch (serviceError) {
        console.error(
          "Failed to invalidate tokens during logout:",
          serviceError
        );
      }

      return res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      throw new HttpException(
        "Failed to logout",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
