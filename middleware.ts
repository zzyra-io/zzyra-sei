import { NextResponse, type NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Cache static assets for a week
  if (request.nextUrl.pathname.match(/\.(jpg|jpeg|png|webp|svg|ico|css|js)$/)) {
    response.headers.set("Cache-Control", "public, max-age=604800, immutable")
  }

  // Cache API responses for 5 minutes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "public, max-age=300, s-maxage=600")
  }

  return response
}

// Specify paths to run the middleware on
export const config = {
  matcher: [
    // Static assets (no capturing groups, just extension match)
    "/:path*.(jpg|jpeg|png|webp|svg|ico|css|js)$",
    // API routes
    "/api/:path*",
  ],
}
