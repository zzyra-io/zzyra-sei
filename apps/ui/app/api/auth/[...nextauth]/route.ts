import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { prisma } from "@/lib/prisma";

// Define custom session type to include our additional properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string | null;
      phone?: string | null;
      createdAt?: Date;
      updatedAt?: Date;
      walletAddress?: string;
    };
    accessToken?: string;
    magicAuthenticated?: boolean;
  }
}

/**
 * NextAuth.js options configuration
 * This setup integrates with our existing Magic Link authentication
 */
export const authOptions: NextAuthOptions = {
  // Disable the default sign in page as we're using our own
  pages: {
    signIn: "/login",
  },
  // Custom session handling to use our existing cookies
  callbacks: {
    // Use our existing JWT tokens from cookies
    async jwt({ token }) {
      try {
        // Get the token from our existing cookie
        const cookieStore = await cookies();
        const existingToken = cookieStore.get("token");
        console.log('existingToken', existingToken)
        
        if (existingToken?.value) {
          try {
            // Decode the token to get user information
            const decoded = jwtDecode<{
              sub: string;
              email: string;
              name?: string;
              exp: number;
            }>(existingToken.value);
            
            // Update the NextAuth token with our token's data
            token.sub = decoded.sub;
            token.email = decoded.email;
            token.name = decoded.name;
            token.accessToken = existingToken.value;
            
            // Get refresh token if available
            const refreshToken = cookieStore.get("refresh_token");
            if (refreshToken?.value) {
              token.refreshToken = refreshToken.value;
            }
            
            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp < now) {
              // Token expired, try to refresh if we have a refresh token
              if (token.refreshToken) {
                // This would call your refresh token endpoint
                // For now, we'll just keep using the existing token
                // TODO: Implement token refresh logic
              }
            }
          } catch (error) {
            console.error("Error decoding JWT token:", error);
            // Invalid token, clear it from NextAuth session
            return {};
          }
        }
        
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    
    // Use the JWT to create the session
    async session({ session, token }) {
      if (token.sub) {
        // If we have a valid token, fetch the user from the database
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              email: true,
              phone: true,
              createdAt: true,
              updatedAt: true,
              userWallets: {
                select: {
                  walletAddress: true
                },
                take: 1
              }
            },
          });
          
          if (user) {
            session.user = {
              id: user.id,
              email: user.email,
              phone: user.phone,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            };
            
            // Add wallet address if available
            const walletAddress = user.userWallets?.[0]?.walletAddress;
            if (walletAddress) {
              session.user.walletAddress = walletAddress;
            }
            
            // Add access token to session if needed by client
            if (token.accessToken) {
              session.accessToken = token.accessToken as string;
              // Mark this session as authenticated via Magic Link
              session.magicAuthenticated = true;
            }
          }
        } catch (error) {
          console.error("Session callback error:", error);
        }
      }
      
      return session;
    },
  },
  // We're not using NextAuth providers directly, but keeping this for compatibility
  providers: [],
};

// Export the NextAuth handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };