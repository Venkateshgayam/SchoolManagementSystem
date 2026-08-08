import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const knownRoles = ["student", "teacher", "management", "admin", "super_admin"];

// Map role -> role-specific dashboard prefix
const ROLE_DASHBOARD_PREFIXES: Record<string, string> = {
  student: "/dashboard/student",
  teacher: "/dashboard/teacher",
  management: "/dashboard/management",
  admin: "/dashboard/admin",
  super_admin: "/dashboard/super-admin",
};

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
  const token = request.cookies.get("access_token")?.value;
  const role = getRoleFromToken(token);
  const isAuthenticated = !!role && knownRoles.includes(role);

  // Login pages - redirect to role-specific dashboard if already signed in
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/admin/login" ||
    pathname === "/super-admin/login" ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/super-admin/login")
  ) {
    if (isAuthenticated && role) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD_PREFIXES[role] || "/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect all dashboard routes
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!token || !isAuthenticated || !role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Generic /dashboard -> redirect to role-specific dashboard
    if (pathname === "/dashboard") {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD_PREFIXES[role] || "/dashboard", request.url));
    }

    // Role-specific dashboard routes: enforce role-based access
    for (const [allowedRole, prefix] of Object.entries(ROLE_DASHBOARD_PREFIXES)) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        // Only the matching role may access this role's dashboard
        if (role !== allowedRole) {
          return NextResponse.redirect(new URL(ROLE_DASHBOARD_PREFIXES[role] || "/dashboard", request.url));
        }
        return NextResponse.next();
      }
    }

    // Consolidated dashboard routes (e.g. /dashboard/attendance, /dashboard/profile)
    // are accessible to any authenticated user.
    return NextResponse.next();
  }

  // Other protected pages (profile/change-password) -> login if not authenticated
  if ((pathname === "/profile" || pathname === "/change-password") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile",
    "/change-password",
    "/login",
    "/login/:path*",
    "/admin/login",
    "/super-admin/login",
    "/admin/login/:path*",
    "/super-admin/login/:path*",
  ],
};