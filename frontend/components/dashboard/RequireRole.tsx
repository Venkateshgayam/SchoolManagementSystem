"use client";

import { currentRole } from "@/lib/permissions";
import AccessDenied from "@/components/dashboard/AccessDenied";

interface RequireRoleProps {
  // Accept any string so callers don't need to import the Role type,
  // and so legacy role strings ("admin", "teacher", "student") work without casting.
  roles: string[];
  children: React.ReactNode;
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const role = currentRole(); // already normalised to "admin" | "teacher" | "student" | null
  if (!role || !roles.includes(role)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}