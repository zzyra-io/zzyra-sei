import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

/**
 * NextAuth.js options configuration
 * This setup integrates with our existing Magic Link authentication
 */

// Export the NextAuth handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
