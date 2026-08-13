import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Final 3 canonical roles
const CANONICAL_ROLES = ["student", "teacher", "admin"];

// Map canonical role -> dashboard prefix
const ROLE_DASHBOARD_PREFIXES: Record<string, string> = {
  student: "/dashboard/student",
  teacher: "/dashboard/teacher",
  admin: "/dashboard/admin",
};

function normalizeRole(role: string | null): string | null {
  if (!role) return null;
  if (CANONICAL_ROLES.includes(role)) return role;
  return null;
}

function getRoleFromToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;



  const rawToken = request.cookies.get("access_token")?.value;
  const rawRole = getRoleFromToken(rawToken);
  const role = normalizeRole(rawRole);
  const isAuthenticated = !!role;

  // 2. Login pages – redirect authenticated users to their dashboard
  const loginPaths = ["/login", "/admin/login"];
  const isLoginPage =
    loginPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/login/");

  if (isLoginPage) {
    if (isAuthenticated && role) {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARD_PREFIXES[role] || "/dashboard", request.url)
      );
    }
    return NextResponse.next();
  }

  // 3. Protect all /dashboard/* routes
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!isAuthenticated || !role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Generic /dashboard → role-specific dashboard
    if (pathname === "/dashboard") {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARD_PREFIXES[role] || "/dashboard", request.url)
      );
    }

    // Enforce role-based access to role-specific dashboard areas
    for (const [allowedRole, prefix] of Object.entries(ROLE_DASHBOARD_PREFIXES)) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        if (role !== allowedRole) {
          // Wrong role – redirect to their own dashboard
          return NextResponse.redirect(
            new URL(ROLE_DASHBOARD_PREFIXES[role] || "/dashboard", request.url)
          );
        }
        return NextResponse.next();
      }
    }

    // Shared dashboard routes (e.g. /dashboard/profile, /dashboard/change-password)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/login/:path*",
    "/admin/login",
    "/admin/login/:path*",
  ],
};