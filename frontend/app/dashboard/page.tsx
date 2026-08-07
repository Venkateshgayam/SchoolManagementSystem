"use client";

import Link from "next/link";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, ClipboardList, FileText, Award,
  BarChart3, Bell, User, GraduationCap, ArrowRight,
} from "lucide-react";
import { getUser, getRoleTitle } from "@/lib/auth";
import StatCard from "@/components/dashboard/StatCard";

const menu = {
  student: [
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  ],
  teacher: [
    { href: "/dashboard/classes", label: "My Classes", icon: BookOpen },
    { href: "/dashboard/students", label: "My Students", icon: UserCheck },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  ],
  management: [
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/teachers", label: "Teachers", icon: UserCheck },
    { href: "/dashboard/classes", label: "Classes", icon: BookOpen },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  ],
  admin: [
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/teachers", label: "Teachers", icon: UserCheck },
    { href: "/dashboard/classes", label: "Classes", icon: BookOpen },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  ],
  super_admin: [
    { href: "/dashboard/students", label: "Students", icon: Users },
    { href: "/dashboard/teachers", label: "Teachers", icon: UserCheck },
    { href: "/dashboard/classes", label: "Classes", icon: BookOpen },
    { href: "/dashboard/subjects", label: "Subjects", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/grades", label: "Grades", icon: BarChart3 },
    { href: "/dashboard/exams", label: "Examinations", icon: Award },
    { href: "/dashboard/assignments", label: "Assignments", icon: FileText },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  ],
};

export default function DashboardHomePage() {
  const user = getUser();
  const role = user?.role;
  const items = role ? menu[role as keyof typeof menu] || menu.student : menu.student;
  const roleTitle = getRoleTitle(role);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary-50 text-primary-700">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
          </h1>
          <p className="text-sm text-gray-500">{roleTitle} Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {role === "student" && <StatCard title="Your Dashboard" value="Active" icon={GraduationCap} />}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modules</h2>
          <p className="text-sm text-gray-600">
            Use the sidebar to navigate school modules. Access is tailored to your role.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="card group flex items-center justify-between p-4 transition-all duration-150 hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-150">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-gray-900">{item.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}