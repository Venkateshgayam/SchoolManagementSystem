"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const guard = () => {
      const parsedUser = getUser();
      if (!parsedUser?.role) {
        router.replace("/login");
        return;
      }
      const roleMap: Record<string, string> = {
        management: "admin",
        super_admin: "admin",
        superadmin: "admin",
        admin: "admin",
        teacher: "teacher",
        student: "student",
      };
      const rawRole = (parsedUser.role || "").toLowerCase();
      const mappedRole = roleMap[rawRole] || rawRole;
      setRole(mappedRole);
    };
    guard();
    window.addEventListener("pageshow", guard);
    return () => window.removeEventListener("pageshow", guard);
  }, [router, pathname]);

  return <DashboardShell role={role}>{children}</DashboardShell>;
}