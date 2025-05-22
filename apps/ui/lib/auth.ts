import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthService } from "@zyra/database";
import { MagicAuthPayload } from "@zyra/database";

// Initialize the auth service
const authService = new AuthService();

// Define the auth options
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Magic Link",
      credentials: {
        didToken: { label: "DID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.didToken) {
          return null;
        }

        try {
          // Authenticate with Magic Link using the DID token
          const payload: MagicAuthPayload = {
            didToken: credentials.didToken
          };
          
          const authResult = await authService.authenticateWithMagic(payload);

          if (!authResult || !authResult.user) {
            return null;
          }

          const user = authResult.user;
          
          return {
            id: user.id,
            email: user.email || '',
            // Use the email username as a fallback display name
            name: user.email ? user.email.split("@")[0] : 'User',
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
