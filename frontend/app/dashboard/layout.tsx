"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useRouter, usePathname } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      setRole(parsedUser.role);
    };
    guard();
    window.addEventListener("pageshow", guard);
    return () => window.removeEventListener("pageshow", guard);
  }, [router, pathname]);

  return (
    <div
      className="min-h-screen bg-gray-50 lg:flex role-bg-gradient"
      data-role={role || undefined}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
}