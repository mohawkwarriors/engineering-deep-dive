import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /drafts and /api/drafts routes
  if (pathname.startsWith("/drafts") || pathname.startsWith("/api/drafts")) {
    const basicAuth = req.headers.get("authorization");

    if (basicAuth) {
      const authValue = basicAuth.split(" ")[1];
      if (authValue) {
        try {
          const decoded = atob(authValue);
          const [user, pwd] = decoded.split(":");

          const expectedUser = process.env.EDITOR_USER || "admin";
          const expectedPwd = process.env.EDITOR_PASSWORD || "deepdive2026";

          if (user === expectedUser && pwd === expectedPwd) {
            return NextResponse.next();
          }
        } catch {
          // invalid base64
        }
      }
    }

    return new NextResponse("Authentication required for Editor Mode", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="HW Insight Editor"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/drafts/:path*", "/api/drafts/:path*"],
};
