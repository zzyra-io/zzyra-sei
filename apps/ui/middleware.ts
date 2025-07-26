import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/",
  "/_next",
  "/favicon.ico",
];

const GUEST_PATHS = ["/login"];
const STATIC_ASSET_REGEX = /\.(?:jpg|jpeg|png|webp|svg|ico|css|js)$/i;

// Simple cache to prevent redirect loops
const redirectCache = new Map<string, number>();
const REDIRECT_CACHE_TTL = 2000;

const isAuthenticated = (req: NextRequest): boolean => {
  // Check for access token in cookies
  const accessToken = req.cookies.get("token")?.value;
  return !!accessToken;
};

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

  // Check authentication
  const userIsAuthenticated = isAuthenticated(req);

  // Handle guest routes (like login page)
  const isGuestPath = GUEST_PATHS.includes(pathname);
  if (isGuestPath && userIsAuthenticated) {
    redirectCache.set(requestUrl, now);
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  // Handle private routes
  if (!userIsAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isPublicPath) {
      return response;
    }

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", req.url);

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
