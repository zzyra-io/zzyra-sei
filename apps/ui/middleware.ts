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
  "/",
];

const GUEST_PATHS = ["/login"];
const STATIC_ASSET_REGEX = /\.(?:jpg|jpeg|png|webp|svg|ico|css|js)$/i;

// Add a simple cache to prevent redirect loops
const redirectCache = new Map<string, number>();
const REDIRECT_CACHE_TTL = 2000; // 2 seconds in milliseconds

export async function middleware(req: NextRequest) {
  const { pathname, origin, searchParams } = req.nextUrl;
  const response = NextResponse.next();
  const requestUrl = req.url;

  // Handle static assets
  if (STATIC_ASSET_REGEX.test(pathname)) {
    response.headers.set("Cache-Control", "public, max-age=604800, immutable");
    return response;
  }

  // Check for potential redirect loops
  const now = Date.now();
  const lastRedirectTime = redirectCache.get(requestUrl);
  const isPotentialLoop =
    lastRedirectTime && now - lastRedirectTime < REDIRECT_CACHE_TTL;

  if (isPotentialLoop) {
    console.warn(
      `Potential redirect loop detected for ${requestUrl}. Allowing request to proceed.`
    );
    return response; // Allow the request to proceed to prevent loops
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

  // Check for token validity
  const isAuthenticated = !!token?.sub;

  // Handle guest routes (like login page)
  const isGuestPath = GUEST_PATHS.includes(pathname);
  if (isGuestPath && isAuthenticated) {
    // User is authenticated and trying to access login page
    const callbackUrl =
      searchParams.get("callbackUrl") || `${origin}/dashboard`;
    try {
      const redirectUrl = new URL(callbackUrl, origin);
      if (
        redirectUrl.origin === origin &&
        !GUEST_PATHS.includes(redirectUrl.pathname)
      ) {
        // Record this redirect to detect loops
        redirectCache.set(requestUrl, now);
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // Invalid callbackUrl
    }

    // Record this redirect to detect loops
    redirectCache.set(requestUrl, now);
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  // Handle private routes
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Don't redirect to login if we're already on a public path
    if (isPublicPath) {
      return response;
    }

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", req.url);

    // Record this redirect to detect loops
    redirectCache.set(requestUrl, now);
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
