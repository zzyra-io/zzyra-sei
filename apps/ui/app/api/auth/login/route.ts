/**
 * Magic Link Authentication API Route
 * 
 * Handles authentication with Magic Link and Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@zyra/database";

const authService = new AuthService();

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
    
    // Authenticate with Magic Link
    const result = await authService.authenticateWithMagic({
      email,
      didToken,
    });
    
    // Create response with user data
    // Create response with user data
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    
    // Set cookies on the response
    response.cookies.set("token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });
    
    response.cookies.set("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    
    // Return the response with cookies
    return response;
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  }
}
