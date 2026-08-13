export const KNOWN_ROLES = ["student", "teacher", "admin"] as const;

export type Role = (typeof KNOWN_ROLES)[number];

// Legacy roles that map to admin for backward compatibility
const LEGACY_TO_ADMIN = ["management", "super_admin", "superadmin"];

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  if (LEGACY_TO_ADMIN.includes(role)) return "admin";
  return role;
}

export const ROLE_SLUGS: Record<string, string> = {
  student: "student",
  teacher: "teacher",
  admin: "admin",
};

export function getUser(): any | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getUser();
}

export function slugToRole(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const entry = Object.entries(ROLE_SLUGS).find(([, value]) => value === slug);
  return entry ? entry[0] : null;
}

export function getDashboardPath(role?: string | null): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "student":
      return "/dashboard/student";
    case "teacher":
      return "/dashboard/teacher";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/dashboard";
  }
}

export function getLoginPath(role?: string | null): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "student":
      return "/login/student";
    case "teacher":
      return "/login/teacher";
    case "admin":
      return "/admin/login";
    default:
      return "/login";
  }
}

export function getRoleTitle(role?: string | null): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "student":
      return "Student";
    case "teacher":
      return "Teacher";
    case "admin":
      return "Admin";
    default:
      return "Portal";
  }
}

export function logout(): void {
  // Capture the role BEFORE clearing auth state so we can redirect to the
  // correct role-specific login page.
  const user = getUser();
  const role = user?.role;
  localStorage.removeItem("user");
  window.location.href = getLoginPath(role);
}
