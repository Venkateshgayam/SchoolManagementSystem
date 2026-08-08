"use client";

import RoleLoginForm from "@/components/auth/RoleLoginForm";

export default function AdminLoginPage() {
  return (
    <RoleLoginForm
      role="admin"
      title="Admin Sign in"
      subtitle="Access the admin dashboard"
      placeholder="admin@school.edu"
    />
  );
}