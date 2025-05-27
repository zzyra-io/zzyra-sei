import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

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

// Export the NextAuth handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
