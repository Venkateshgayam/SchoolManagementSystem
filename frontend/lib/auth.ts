export const KNOWN_ROLES = ["student", "teacher", "management", "admin", "super_admin"] as const;

export type Role = (typeof KNOWN_ROLES)[number];

export const ROLE_SLUGS: Record<string, string> = {
  student: "student",
  teacher: "teacher",
  management: "management",
  admin: "admin",
  super_admin: "super-admin",
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
  switch (role) {
    case "student":
      return "/dashboard/student";
    case "teacher":
      return "/dashboard/teacher";
    case "management":
      return "/dashboard/management";
    case "admin":
      return "/dashboard/admin";
    case "super_admin":
      return "/dashboard/super-admin";
    default:
      return "/dashboard";
  }
}

export function getLoginPath(role?: string | null): string {
  switch (role) {
    case "student":
      return "/login/student";
    case "teacher":
      return "/login/teacher";
    case "management":
      return "/login/management";
    case "admin":
      return "/admin/login";
    case "super_admin":
      return "/super-admin/login";
    default:
      return "/login";
  }
}

export function getRoleTitle(role?: string | null): string {
  switch (role) {
    case "student":
      return "Student";
    case "teacher":
      return "Teacher";
    case "management":
      return "Management";
    case "admin":
      return "Admin";
    case "super_admin":
      return "Super Admin";
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
