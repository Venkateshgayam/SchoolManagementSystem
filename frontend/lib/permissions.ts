import { getUser, normalizeRole } from "@/lib/auth";

export type Permission =
  | "student:create"
  | "student:update"
  | "student:delete"
  | "teacher:create"
  | "teacher:update"
  | "teacher:delete"
  | "class:create"
  | "class:update"
  | "class:delete"
  | "subject:create"
  | "subject:update"
  | "subject:delete"
  | "fee:create"
  | "fee:update"
  | "fee:delete"
  | "attendance:create"
  | "assignment:create"
  | "exam:create"
  | "grade:create"
  | "grade:update"
  | "notification:create"
  | "user:manage";

// Final 3-role permission matrix.
// Legacy roles (management, super_admin) are normalised to "admin" at login time,
// so they naturally inherit all admin permissions without requiring separate entries.
const PERMISSIONS: Record<Permission, readonly string[]> = {
  "student:create":    ["admin"],
  "student:update":   ["admin"],
  "student:delete":   ["admin"],
  "teacher:create":   ["admin"],
  "teacher:update":   ["admin"],
  "teacher:delete":   ["admin"],
  "class:create":     ["admin"],
  "class:update":     ["admin"],
  "class:delete":     ["admin"],
  "subject:create":   ["admin"],
  "subject:update":   ["admin"],
  "subject:delete":   ["admin"],
  "fee:create":       ["admin"],
  "fee:update":       ["admin"],
  "fee:delete":       ["admin"],
  "attendance:create":["admin", "teacher"],
  "assignment:create":["admin", "teacher"],
  "exam:create":      ["admin"],
  "grade:create":     ["admin", "teacher"],
  "grade:update":     ["admin", "teacher"],
  "notification:create": ["admin", "teacher"],
  "user:manage":      ["admin"],
};

export function currentRole(): string | null {
  const user = getUser();
  return normalizeRole(user?.role);
}

export function can(permission: Permission, role: string | null = currentRole()): boolean {
  if (!role) return false;
  const normalised = normalizeRole(role) ?? role;
  return PERMISSIONS[permission]?.includes(normalised) ?? false;
}
