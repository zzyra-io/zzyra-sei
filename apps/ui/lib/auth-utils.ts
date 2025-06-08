import { cookies } from "next/headers";
import { jwtVerify, JWTVerifyResult } from "jose";

interface User {
  id: string;
  email: string;
  issuer: string;
}

interface Session {
  user: User | null;
}

/**
 * Gets the current server session by verifying the JWT token in cookies
 * @returns Session object with user data if authenticated
 */
export async function getServerSession(): Promise<Session> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return { user: null };
    }

    // Verify the JWT token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );
    const { payload } = await jwtVerify(token, secret);

    if (!payload.sub) {
      return { user: null };
    }

    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        issuer: payload.issuer as string,
      },
    };
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return { user: null };
  }
}

/**
 * Checks if the user is authenticated on the server
 * @returns boolean indicating if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session.user;
}
