"use client";

import TeachersManager from "@/components/dashboard/managers/TeachersManager";
import RequireRole from "@/components/dashboard/RequireRole";

export default function TeachersPage() {
  return (
    <RequireRole roles={["management", "admin", "super_admin"]}>
      <TeachersManager />
    </RequireRole>
  );
}