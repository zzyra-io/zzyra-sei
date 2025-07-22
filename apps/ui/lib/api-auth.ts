import { NextResponse } from "next/server";
import { AuthService } from "@zyra/database";

// Initialize the auth service
const authService = new AuthService();

/**
 * Helper function to validate user authentication in API routes
 * Returns the user ID if authenticated, or sends an unauthorized response
 */
export async function validateApiAuth(request: Request) {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = request.headers.get("Authorization");
    const cookies = request.headers.get("cookie");

    let token = null;

    // Try Authorization header first
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Fallback to cookies for Next.js auth compatibility
    if (!token && cookies) {
      const cookiePairs = cookies
        .split(";")
        .map((pair) => pair.trim().split("="));
      const sessionToken = cookiePairs.find(
        ([name]) =>
          name === "next-auth.session-token" ||
          name === "__Secure-next-auth.session-token"
      )?.[1];

      if (sessionToken) {
        token = sessionToken;
      }
    }

    if (!token) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Authentication token required" },
          { status: 401 }
        ),
        userId: null,
      };
    }

    // Validate token with AuthService
    try {
      const userId = authService.verifySession(token);
      if (!userId) {
        throw new Error("Invalid token");
      }

      return {
        authorized: true,
        response: null,
        userId,
      };
    } catch (authError) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Invalid or expired authentication token" },
          { status: 401 }
        ),
        userId: null,
      };
    }
  } catch (error) {
    console.error("Auth validation error:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication error" },
        { status: 500 }
      ),
      userId: null,
    };
  }
}
