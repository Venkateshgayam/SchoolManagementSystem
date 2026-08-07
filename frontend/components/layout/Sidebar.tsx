"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, Users, BookOpen, ClipboardList, Bell, LogOut, Key, UserCheck, BarChart3, FileText, Award, User } from "lucide-react";
import { api } from "@/lib/api";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems: Record<string, Array<{ href: string; label: string; icon: any }>> = {
  student: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BookOpen },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: ClipboardList },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  ],
  teacher: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/classes", label: "My Classes", icon: BookOpen },
    { href: "/dashboard/students", label: "My Students", icon: UserCheck },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/assignments", label: "Assignments", icon: ClipboardList },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
  ],
  management: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/teachers", label: "Teachers", icon: UserCheck },
    { href: "/dashboard/classes", label: "Classes", icon: BookOpen },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
  ],
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/teachers", label: "Teachers", icon: UserCheck },
    { href: "/dashboard/classes", label: "Classes", icon: BookOpen },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
  ],
  super_admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/teachers", label: "Teachers", icon: UserCheck },
    { href: "/dashboard/classes", label: "Classes", icon: BookOpen },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
  ],
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let parsed: { role?: string } | null = null;
    try {
      parsed = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      parsed = null;
    }
    setRole(parsed?.role || "student");
  }, [pathname]);

  const items = role ? menuItems[role as keyof typeof menuItems] || menuItems.student : [];

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-600 bg-opacity-75"></div>
        </div>
      )}
      <aside
        className={`fixed top-0 left-0 z-[60] w-64 h-screen bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none lg:sticky lg:top-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center">
            <div className="bg-role-600 text-white font-bold text-lg px-2 py-1 rounded-lg">SMS</div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-2 text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-8">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-role-50 text-role-700"
                    : "text-gray-600 hover:bg-role-50/50 hover:text-role-800"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-role-500" aria-hidden="true" />
                )}
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <hr className="my-4 border-gray-200" />
          <Link
            href="/change-password"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg transition-all duration-150 hover:bg-role-50/50 hover:text-role-800"
          >
            <Key className="mr-3 h-5 w-5" />
            Change Password
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg transition-all duration-150 hover:bg-role-50/50 hover:text-role-800"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </nav>
      </aside>
    </>
  );
}