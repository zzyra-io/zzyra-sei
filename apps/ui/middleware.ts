import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/signin",
  "/api/auth/callback",
  "/api/health",
];

const GUEST_PATHS = ["/login"];
const STATIC_ASSET_REGEX = /\.(?:jpg|jpeg|png|webp|svg|ico|css|js)$/i;

export async function middleware(req: NextRequest) {
  const { pathname, origin, searchParams } = req.nextUrl;
  const response = NextResponse.next();

  // Handle static assets
  if (STATIC_ASSET_REGEX.test(pathname)) {
    response.headers.set("Cache-Control", "public, max-age=604800, immutable");
    return response;
  }

  // Allow public paths
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublicPath) {
    if (pathname.startsWith("/api/")) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=300, s-maxage=600"
      );
    }
    return response;
  }

  // Get session token
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName,
  });
  console.log("Middleware: Pathname:", pathname, "Token:", token);

  // Handle guest routes
  const isGuestPath = GUEST_PATHS.includes(pathname);
  if (isGuestPath && token?.sub) {
    const callbackUrl =
      searchParams.get("callbackUrl") || `${origin}/dashboard`;
    try {
      const redirectUrl = new URL(callbackUrl, origin);
      if (
        redirectUrl.origin === origin &&
        !GUEST_PATHS.includes(redirectUrl.pathname)
      ) {
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // Invalid callbackUrl
    }
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  // Handle private routes
  if (!token?.sub) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Set cache headers for private API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.*$).*)"],
};
