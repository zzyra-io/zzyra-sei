import { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import api from "./services/api";

// Extend the User type to include auth tokens
interface AuthUser extends User {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

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
        } as AuthUser;
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
        const authUser = user as AuthUser;
        token.sub = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name;
        token.accessToken = authUser.accessToken;
        token.refreshToken = authUser.refreshToken;
        token.expiresAt = authUser.expiresAt;
      }

      // Validate existing token with NestJS API
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

          token.sub = decoded.userId;
          token.email = decoded.email;
          token.accessToken = existingToken;

          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp < now && token.refreshToken) {
            try {
              const response = await api.post("/auth/refresh-token", {
                refreshToken: token.refreshToken,
              });

              const refreshedTokens = response.data;

              cookieStore.set("token", refreshedTokens.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 24,
                path: "/",
              });

              if (refreshedTokens.refreshToken) {
                cookieStore.set("refresh_token", refreshedTokens.refreshToken, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "strict",
                  maxAge: 60 * 60 * 24 * 7,
                  path: "/",
                });
                token.refreshToken = refreshedTokens.refreshToken;
              }

              token.accessToken = refreshedTokens.accessToken;
              const newDecoded = jwtDecode<{ userId: string; email: string }>(
                refreshedTokens.accessToken
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
    async session({
      session,
      token,
    }: {
      session: Session;
      token: Record<string, unknown>;
    }) {
      if (token.sub && token.accessToken) {
        try {
          // Validate session with NestJS API instead of direct Prisma access
          const response = await api.get("/user/profile", {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          });

          if (response.data && response.data.user) {
            const userData = response.data.user;
            session.user = {
              id: userData.id,
              email: userData.email,
              phone: userData.phone,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
              walletAddress: userData.userWallets?.[0]?.walletAddress,
              // Include profile data if available
              profile: userData.profile,
            };
            session.accessToken = token.accessToken as string;
            session.magicAuthenticated = true;
            session.expires = token.expiresAt
              ? new Date(token.expiresAt as string).toISOString()
              : session.expires;
          }
        } catch (error) {
          console.error("Session validation error with NestJS API:", error);
          // If API validation fails, clear the session but maintain required properties
          return { ...session, user: undefined };
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
      profile?: {
        id: string;
        email: string;
        fullName?: string | null;
        avatarUrl?: string | null;
        subscriptionTier: string;
        subscriptionStatus: string;
        subscriptionExpiresAt?: Date | null;
        monthlyExecutionQuota: number;
        monthlyExecutionCount: number;
        stripeCustomerId?: string | null;
        stripeSubscriptionId?: string | null;
        createdAt: Date;
        updatedAt: Date;
        lastSeenAt?: Date | null;
        monthlyExecutionsUsed: number;
        telegramChatId?: string | null;
        discordWebhookUrl?: string | null;
      };
    };
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    magicAuthenticated?: boolean;
  }
}
