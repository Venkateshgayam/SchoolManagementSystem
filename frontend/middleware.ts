import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const knownRoles = ["student", "teacher", "management", "admin", "super_admin"];

const rolePrefixes = [
  "/dashboard/student",
  "/dashboard/teacher",
  "/dashboard/management",
  "/dashboard/admin",
  "/dashboard/super-admin",
];

// Map a feature slug (old role-specific subpath) to the consolidated route.
const FEATURE_ROUTES: Record<string, string> = {
  classes: "/dashboard/classes",
  students: "/dashboard/students",
  teachers: "/dashboard/teachers",
  subjects: "/dashboard/subjects",
  attendance: "/dashboard/attendance",
  assignments: "/dashboard/assignments",
  exams: "/dashboard/exams",
  examinations: "/dashboard/exams",
  grades: "/dashboard/grades",
  notifications: "/dashboard/notifications",
  profile: "/dashboard/profile",
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

function resolveLegacyDashboardPath(pathname: string): string {
  let remainder = pathname;
  for (const prefix of rolePrefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      remainder = pathname.slice(prefix.length);
      break;
    }
  }
  if (!remainder) return "/dashboard";
  const pieces = remainder.split("/").filter(Boolean);
  if (pieces.length === 0) return "/dashboard";
  return FEATURE_ROUTES[pieces[0]] || "/dashboard";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const role = getRoleFromToken(token);
  const isAuthenticated = !!role && knownRoles.includes(role);

  // Legacy role login URLs -> single /login (or /dashboard if already signed in)
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/admin/login" ||
    pathname === "/super-admin/login" ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/super-admin/login")
  ) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Protect all dashboard routes - role is determined from the token, not the URL
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!token || !isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Legacy role-prefixed dashboard routes are consolidated into role-independent URLs
    const isLegacy = rolePrefixes.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (isLegacy) {
      return NextResponse.redirect(new URL(resolveLegacyDashboardPath(pathname), request.url));
    }
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