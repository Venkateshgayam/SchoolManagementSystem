// components/dashboard/sidebars/TeacherSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";
import {
  LayoutDashboard,
  User,
  BookOpen,
  UserCheck,
  ClipboardList,
  FileText,
  Award,
  BarChart3,
  CalendarDays,
  Bell,
  Key,
} from "lucide-react";

const menuItems = [
  { href: "/dashboard/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/teacher/classes", label: "My Classes", icon: BookOpen },
  { href: "/dashboard/teacher/students", label: "My Students", icon: UserCheck },
  { href: "/dashboard/teacher/attendance", label: "Attendance", icon: ClipboardList },
  { href: "/dashboard/teacher/assignments", label: "Assignments", icon: FileText },
  { href: "/dashboard/teacher/exams", label: "Examinations", icon: Award },
  { href: "/dashboard/teacher/grades", label: "Grades", icon: BarChart3 },
  { href: "/dashboard/teacher/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/dashboard/teacher/leave-requests", label: "Leave Requests", icon: CalendarDays },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export default function TeacherSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  
  const { settings } = useSettings();
  const schoolName = settings.school_name || "School Management";
  const schoolInitials = schoolName.split(" ").map((w: string) => w[0]).join("").substring(0, 3).toUpperCase() || "SMS";
  return (
    <aside
      className={`fixed top-0 left-0 z-[60] w-64 h-screen bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none lg:sticky lg:top-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <Link href="/dashboard/teacher" className="flex items-center">
          <div className="bg-role-600 text-white font-bold text-lg px-2 py-1 rounded-lg">{schoolInitials}</div>
        </Link>
        <button onClick={onClose} className="lg:hidden p-2 text-gray-600">
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-8">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                isActive ? "bg-role-50 text-role-700" : "text-gray-600 hover:bg-role-50/50 hover:text-role-800"
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
      </nav>
    </aside>
  );
}
