"use client";

import { currentRole } from "@/lib/permissions";
import type { Role } from "@/lib/auth";
import AccessDenied from "@/components/dashboard/AccessDenied";

interface RequireRoleProps {
  roles: Role[];
  children: React.ReactNode;
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const role = currentRole();
  if (!role || !roles.includes(role)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}