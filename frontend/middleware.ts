import { NextResponse, type NextRequest } from "next/server";

const authPaths = ["/login", "/register", "/forgot-password", "/verify-email"];
const protectedPrefixes = [
  "/dashboard",
  "/inbox",
  "/contacts",
  "/channels",
  "/ai-settings",
  "/analytics",
  "/team",
  "/settings",
];

const isProtectedPath = (pathname: string): boolean =>
  protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;

  if (isProtectedPath(pathname) && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authPaths.includes(pathname) && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|logo.svg).*)"],
};
