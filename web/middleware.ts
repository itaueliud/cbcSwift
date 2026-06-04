import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const headers = new Headers(request.headers);

  if (host.includes(".") && !host.startsWith("localhost")) {
    const subdomain = host.split(".")[0];
    headers.set("x-tenant-subdomain", subdomain);
  }

  return NextResponse.next({
    request: {
      headers
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

