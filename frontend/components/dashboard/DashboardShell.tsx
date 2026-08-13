// components/dashboard/DashboardShell.tsx
"use client";

import { ReactNode, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import AdminSidebar from "@/components/dashboard/sidebars/AdminSidebar";
import TeacherSidebar from "@/components/dashboard/sidebars/TeacherSidebar";
import StudentSidebar from "@/components/dashboard/sidebars/StudentSidebar";

interface DashboardShellProps {
  role: string | null;
  children: ReactNode;
}

export default function DashboardShell({ role, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderSidebar = () => {
    switch (role) {
      case "admin":
        return <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />;
      case "teacher":
        return <TeacherSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />;
      case "student":
        return <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />;
      default:
        // fallback – no sidebar
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:flex role-bg-gradient" data-role={role || undefined}>
      {renderSidebar()}
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
