// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const ALLOWED_IPS = (process.env.ALLOWED_IPS ?? "").split(",");

export function middleware(req: NextRequest) {
  let ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  // dev 環境では fallback
  if (process.env.NODE_ENV === "development" && !ip) {
    ip = "127.0.0.1";
  }

  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (!ALLOWED_IPS.includes(ip)) {
      // HTML を返して画面に表示
      return new NextResponse(
        `
          <html>
            <head><title>Access Denied</title></head>
            <body style="font-family: sans-serif; padding: 2rem;">
              <h1>Access Denied</h1>
              <p>Your IP: <strong>${ip || "unknown"}</strong></p>
            </body>
          </html>
        `,
        {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
