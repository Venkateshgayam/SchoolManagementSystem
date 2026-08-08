"use client";

import RoleLoginForm from "@/components/auth/RoleLoginForm";

export default function SuperAdminLoginPage() {
  return (
    <RoleLoginForm
      role="super_admin"
      title="Super Admin Sign in"
      subtitle="Access the system dashboard"
      placeholder="superadmin@school.edu"
    />
  );
}