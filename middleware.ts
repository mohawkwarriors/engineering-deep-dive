import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  try {
    const { pathname, searchParams } = req.nextUrl;

    // Protect /drafts and /api/drafts routes
    if (pathname.startsWith("/drafts") || pathname.startsWith("/api/drafts")) {
      const expectedUser = (typeof process !== "undefined" && process.env?.EDITOR_USER) || "admin";
      const expectedPwd = (typeof process !== "undefined" && process.env?.EDITOR_PASSWORD) || "deepdive2026";

      // 1. Allow mobile convenience bypass via URL query param ?key=deepdive2026 or ?token=deepdive2026
      const token = searchParams.get("token") || searchParams.get("key");
      if (token === expectedPwd) {
        const response = NextResponse.next();
        response.cookies.set("editor_auth", expectedPwd, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
        return response;
      }

      // 2. Allow if valid editor_auth cookie is already set
      const cookieAuth = req.cookies.get("editor_auth")?.value;
      if (cookieAuth === expectedPwd) {
        return NextResponse.next();
      }

      // 3. HTTP Basic Auth
      const basicAuth = req.headers.get("authorization");
      if (basicAuth) {
        const parts = basicAuth.split(" ");
        if (parts.length === 2 && parts[0] === "Basic") {
          try {
            const decoded =
              typeof atob === "function"
                ? atob(parts[1])
                : Buffer.from(parts[1], "base64").toString("utf-8");
            const [user, pwd] = decoded.split(":");

            if (user === expectedUser && pwd === expectedPwd) {
              return NextResponse.next();
            }
          } catch (e) {
            console.error("Auth decoding failed:", e);
          }
        }
      }

      // 4. Challenge with HTTP Basic Auth
      return new NextResponse("Authentication required for The HW Insider Editor", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="The HW Insider Editor"',
        },
      });
    }

    return NextResponse.next();
  } catch (err) {
    console.error("Middleware caught error:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/drafts", "/drafts/:path*", "/api/drafts/:path*"],
};
