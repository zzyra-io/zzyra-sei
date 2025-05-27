import { prisma } from "@/lib/prisma";
import { AuthService, MagicAuthPayload } from "@zyra/database";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";

const authService = new AuthService(prisma);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      didToken,
      isOAuth,
      oauthProvider,
      oauthUserInfo,
      callbackUrl,
    } = body;

    if (!email || !didToken) {
      return NextResponse.json(
        { error: "Email and DID token are required" },
        { status: 400 }
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

    // Authenticate with Magic Link
    const magicPayload: MagicAuthPayload = {
      email,
      didToken,
      isOAuth,
      oauthProvider,
      oauthUserInfo,
    };
    const { session, user } = await authService.authenticateWithMagic(
      magicPayload
    );
    console.log("Auth Result:", { user, session });

    if (!session || !session.accessToken || !user) {
      console.error(
        "Login route: Authentication successful but no session tokens or user returned"
      );
      return NextResponse.json(
        { error: "Authentication failed: Invalid session" },
        { status: 401 }
      );
    }

    // Create NextAuth JWT
    const token = {
      sub: user.id,
      email: user.email || "",
      name: user.email ? user.email.split("@")[0] : "User",
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    };

    // Encode the session token
    const sessionToken = await encode({
      token,
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: authOptions.session?.maxAge || 30 * 24 * 60 * 60,
    });
    console.log("Encoded Session Token:", sessionToken);

    // Set cookies
    const cookieStore = await cookies();
    const cookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";
    cookieStore.set({
      name: cookieName,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    cookieStore.set({
      name: "token",
      value: session.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    if (session.refreshToken) {
      cookieStore.set({
        name: "refresh_token",
        value: session.refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    // Clean callbackUrl
    let finalCallbackUrl = "/dashboard";
    try {
      const url = new URL(
        callbackUrl || req.headers.get("referer") || "",
        req.nextUrl.origin
      );
      if (!url.pathname.startsWith("/login")) {
        finalCallbackUrl = url.toString();
      }
    } catch {
      // Use default if invalid
    }

    // Create response
    const response = NextResponse.json({
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

    return response;
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}
