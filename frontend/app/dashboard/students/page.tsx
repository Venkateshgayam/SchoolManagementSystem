"use client";

import StudentsManager from "@/components/dashboard/managers/StudentsManager";
import RequireRole from "@/components/dashboard/RequireRole";

export default function StudentsPage() {
  return (
    <RequireRole roles={["teacher", "management", "admin", "super_admin"]}>
      <StudentsManager />
    </RequireRole>
  );
}