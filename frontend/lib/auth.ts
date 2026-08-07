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

export function getDashboardPath(_role?: string | null): string {
  return "/dashboard";
}

export function getLoginPath(_role?: string | null): string {
  return "/login";
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
  localStorage.removeItem("user");
  window.location.href = "/login";
}