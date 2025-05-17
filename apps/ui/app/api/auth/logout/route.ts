/**
 * Logout API Route
 * 
 * Handles user logout by clearing auth cookies
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@zyra/database";

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    // Create the response object
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
    
    // Clear the authentication cookies
    response.cookies.delete("token");
    response.cookies.delete("refresh_token");
    
    // Invalidate tokens in the auth service
    try {
      // Extract token from cookies to identify the user
      const token = req.cookies.get("token")?.value;
      if (token) {
        // Verify token to get userId
        const userId = authService.verifySession(token);
        if (userId) {
          // Sign out the user to invalidate all tokens
          await authService.signOut(userId);
          console.log(`Logged out user with ID: ${userId}`);
        }
      }
    } catch (serviceError) {
      // Don't fail the logout if the service call fails
      // Just log the error and continue
      console.error("Failed to invalidate tokens during logout:", serviceError);
    }
    
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
