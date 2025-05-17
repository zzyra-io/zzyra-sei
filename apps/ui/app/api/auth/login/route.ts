/**
 * Magic Link Authentication API Route
 *
 * Handles authentication with Magic Link and Prisma
 */

import { prisma } from "@/lib/prisma";
import { AuthService } from "@zyra/database";
import { NextRequest, NextResponse } from "next/server";

// Create a single PrismaClient instance for this route
const authService = new AuthService(prisma);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, didToken } = body;

    if (!email || !didToken) {
      return NextResponse.json(
        { error: "Email and DID token are required" },
        { status: 400 }
      );
    }

    console.log("Login route: Received email and DID token", {
      email,
      didToken,
    });

    // Authenticate with Magic Link
    const result = await authService.authenticateWithMagic({
      email,
      didToken,
    });

    // Extract session and user data from the result
    const { session, user } = result;
    console.log("Login route: Authentication result", { session, user });

    if (!session || !session.accessToken) {
      console.error(
        "Login route: Authentication successful but no session tokens returned"
      );
      return NextResponse.json(
        { error: "Authentication failed: Invalid session" },
        { status: 401 }
      );
    }

    // Create response object
    const response = NextResponse.next();

    // Set cookies with standardized names
    response.cookies.set({
      name: "token",
      value: session.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day in seconds
    });

    if (session.refreshToken) {
      response.cookies.set({
        name: "refresh_token",
        value: session.refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      });
    }

    // Create a sanitized session object that doesn't expose tokens
    const safeSession = {
      expiresAt: session.expiresAt,
      user: session.user,
      // Explicitly omit tokens
    };

    // Return the response with the sanitized data
    return NextResponse.json({
      session: safeSession,
      user,
      success: true,
    });
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}
