import { NextResponse, type NextRequest } from "next/server";

// Define public paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback", // If you have an OAuth callback page
  // Add other public paths like marketing pages, /api/auth routes, etc.
  // Ensure API routes for login/logout are public
  "/api/auth/login",
  "/api/auth/logout", // if you have one
  "/api/health", // example public API endpoint
];

// Define paths for static assets and specific API patterns that might be public or handled differently
const STATIC_ASSET_PATTERN = /\.(jpg|jpeg|png|webp|svg|ico|css|js)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next(); // Start with a pass-through response

  // 1. Handle Caching for Static Assets (can be public)
  if (STATIC_ASSET_PATTERN.test(pathname)) {
    response.headers.set("Cache-Control", "public, max-age=604800, immutable");
    return response; // Static assets don't need auth checks
  }

  // 2. Check if the path is public
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    // For public API routes, you might still want specific caching
    if (pathname.startsWith("/api/")) {
      response.headers.set("Cache-Control", "public, max-age=300, s-maxage=600");
    }
    return response; // Allow access to public paths
  }

  // 3. For non-public paths, check for authentication token
  // const token = request.cookies.get("token")?.value;

  // if (!token) {
  //   // If no token and trying to access a private page, redirect to login
  //   // Preserve search params if any (e.g., for redirecting back after login)
  //   const loginUrl = new URL("/login", request.url);
  //   if (pathname !== "/") { // Avoid adding callback for root if it's a private dashboard
  //     loginUrl.searchParams.set("callbackUrl", pathname);
  //   }
  //   return NextResponse.redirect(loginUrl);
  // }

  // 4. (Optional but Recommended) Token Validation:
  // At this point, a token exists. For higher security, you should validate it.
  // This might involve a quick API call to a /api/auth/verify endpoint or using a JWT library
  // if the secret is available to the middleware (not always recommended for edge functions).
  // If validation fails, redirect to login.
  // For simplicity, this example proceeds if a token is present.

  // 5. If token exists (and optionally validated), allow access
  // For private API routes, you might set different cache headers or no-cache
  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, proxy-revalidate");
  }

  return response;
}

// Specify paths to run the middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (jpg, jpeg, png, etc.) are handled by the STATIC_ASSET_PATTERN check
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
    // Include API routes explicitly if not covered by the general matcher or if specific handling is needed early
    // However, the general matcher above should cover them. If you face issues, you can add "/api/:path*" explicitly.
  ],
};
