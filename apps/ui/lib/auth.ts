import { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Magic Link",
      credentials: {
        email: { label: "Email", type: "email" },
        id: { label: "User ID", type: "text" },
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
        expiresAt: { label: "Expires At", type: "text" },
      },
      async authorize(credentials) {
        // Minimal validation since /api/auth/login handles authentication
        if (
          !credentials?.id ||
          !credentials?.email ||
          !credentials?.accessToken
        ) {
          return null;
        }
        return {
          id: credentials.id,
          email: credentials.email,
          name: credentials.email ? credentials.email.split("@")[0] : "User",
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: credentials.expiresAt
            ? new Date(credentials.expiresAt)
            : undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: populate token from user
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.expiresAt = user.expiresAt;
      }

      // Validate existing token
      const cookieStore = await cookies();
      const existingToken = cookieStore.get("token")?.value;
      if (existingToken) {
        try {
          const decoded = jwtDecode<{
            userId: string;
            email: string;
            iat: number;
            exp: number;
          }>(existingToken);

          token.sub = decoded.userId; // Use userId from accessToken
          token.email = decoded.email;
          token.accessToken = existingToken;

          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp < now && token.refreshToken) {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/refresh-token`,
                {
                  method: "POST",
                  body: JSON.stringify({ refreshToken: token.refreshToken }),
                  headers: { "Content-Type": "application/json" },
                }
              );

              if (!response.ok) throw new Error("Failed to refresh token");

              const { accessToken, refreshToken: newRefreshToken } =
                await response.json();

              cookieStore.set("token", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 24,
                path: "/",
              });

              if (newRefreshToken) {
                cookieStore.set("refresh_token", newRefreshToken, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "strict",
                  maxAge: 60 * 60 * 24 * 7,
                  path: "/",
                });
                token.refreshToken = newRefreshToken;
              }

              token.accessToken = accessToken;
              const newDecoded = jwtDecode<{ userId: string; email: string }>(
                accessToken
              );
              token.sub = newDecoded.userId;
              token.email = newDecoded.email;
            } catch (error) {
              console.error("Token refresh failed:", error);
              return {}; // Clear token to force re-authentication
            }
          }
        } catch (error) {
          console.error("Error decoding JWT token:", error);
          return {};
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: any }) {
      if (token.sub) {
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
                select: { walletAddress: true },
                take: 1,
              },
            },
          });

          if (user) {
            session.user = {
              id: user.id,
              email: user.email,
              phone: user.phone,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              walletAddress: user.userWallets?.[0]?.walletAddress,
            };
            session.accessToken = token.accessToken;
            session.magicAuthenticated = true;
            session.expires = token.expiresAt
              ? new Date(token.expiresAt).toISOString()
              : session.expires;
          }
        } catch (error) {
          console.error("Session callback error:", error);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

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
    refreshToken?: string;
    expiresAt?: Date;
    magicAuthenticated?: boolean;
  }
}
