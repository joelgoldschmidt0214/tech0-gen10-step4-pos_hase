// src/middleware.ts
import { NextResponse, NextRequest } from "next/server";

// 環境変数を正規化（空白除去）
const ALLOWED_IPS = (process.env.ALLOWED_IPS ?? "")
  .split(",")
  .map((ip) => ip.trim());

export function middleware(req: NextRequest) {
  let ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  // dev 環境では fallback
  if (process.env.NODE_ENV === "development" && !ip) {
    ip = "127.0.0.1";
  }

  // Azure などでは "182.169.237.74:52835" のようにポート付きで来るので除去
  if (ip.includes(":")) {
    ip = ip.split(":")[0];
  }

  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (!ALLOWED_IPS.includes(ip)) {
      return new NextResponse(
        `
          <html>
            <head><title>Access Denied</title></head>
            <body style="font-family: sans-serif; padding: 2rem;">
              <h1>Access Denied</h1>
              <p>Your IP: <strong>${ip || "unknown"}</strong></p>
              <p>Allowed: ${ALLOWED_IPS.join(", ")}</p>
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
