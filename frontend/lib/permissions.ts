import { getUser, KNOWN_ROLES, type Role } from "@/lib/auth";

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

const PERMISSIONS: Record<Permission, readonly Role[]> = {
  "student:create": ["admin", "super_admin"],
  "student:update": ["admin", "super_admin"],
  "student:delete": ["admin", "super_admin"],
  "teacher:create": ["admin", "super_admin"],
  "teacher:update": ["admin", "super_admin"],
  "teacher:delete": ["admin", "super_admin"],
  "class:create": ["admin", "super_admin"],
  "class:update": ["admin", "super_admin"],
  "class:delete": ["admin", "super_admin"],
  "subject:create": ["admin", "super_admin"],
  "subject:update": ["admin", "super_admin"],
  "subject:delete": ["admin", "super_admin"],
  "fee:create": ["admin", "super_admin", "management"],
  "fee:update": ["admin", "super_admin", "management"],
  "fee:delete": ["admin", "super_admin"],
  "attendance:create": ["admin", "super_admin", "teacher"],
  "assignment:create": ["admin", "super_admin", "teacher"],
  "exam:create": ["admin", "super_admin"],
  "grade:create": ["admin", "super_admin", "teacher"],
  "grade:update": ["admin", "super_admin", "teacher"],
  "notification:create": ["admin", "super_admin", "management", "teacher"],
  "user:manage": ["super_admin"],
};

// Additional mappings: expand management privileges for management role parity
// Add fee permissions and allow management to perform student/teacher/subject operations where appropriate
PERMISSIONS["student:create"] = ([...PERMISSIONS["student:create"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["student:update"] = ([...PERMISSIONS["student:update"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["student:delete"] = ([...PERMISSIONS["student:delete"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["teacher:create"] = ([...PERMISSIONS["teacher:create"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["teacher:update"] = ([...PERMISSIONS["teacher:update"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["teacher:delete"] = ([...PERMISSIONS["teacher:delete"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["subject:create"] = ([...PERMISSIONS["subject:create"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["subject:update"] = ([...PERMISSIONS["subject:update"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["subject:delete"] = ([...PERMISSIONS["subject:delete"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);
PERMISSIONS["attendance:create"] = ([...PERMISSIONS["attendance:create"], "management"].filter((v, i, a) => a.indexOf(v) === i) as Role[]);

// Fee permissions
PERMISSIONS["fee:create"] = ["admin", "super_admin", "management"];
PERMISSIONS["fee:update"] = ["admin", "super_admin", "management"];
PERMISSIONS["fee:delete"] = ["admin", "super_admin"];

export function currentRole(): Role | null {
  const user = getUser();
  const role = user?.role;
  return (KNOWN_ROLES as readonly string[]).includes(role) ? (role as Role) : null;
}

export function can(permission: Permission, role: Role | null = currentRole()): boolean {
  if (!role) return false;
  return PERMISSIONS[permission].includes(role);
}
