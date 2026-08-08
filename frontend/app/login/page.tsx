"use client";

import Link from "next/link";
import { useAuthGate } from "@/hooks/useAuthGate";
import { GraduationCap, UserCheck, Building2, ChevronRight } from "lucide-react";

const portals = [
  {
    role: "student",
    href: "/login/student",
    label: "Student",
    description: "Access grades, assignments, attendance, and more",
    icon: GraduationCap,
    color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
  },
  {
    role: "teacher",
    href: "/login/teacher",
    label: "Teacher",
    description: "Manage classes, grades, attendance, and students",
    icon: UserCheck,
    color: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
  },
  {
    role: "management",
    href: "/login/management",
    label: "Management",
    description: "Oversee school operations, reports, and analytics",
    icon: Building2,
    color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
  },
];

export default function LoginPortalPage() {
  const gate = useAuthGate();

  if (gate !== "guest") {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" aria-label="Loading" role="status" />
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50/70 via-gray-50 to-gray-50">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="bg-primary-600 text-white font-bold text-xl px-3 py-1 rounded-lg">SMS</div>
              <span className="text-lg font-semibold text-gray-900 hidden sm:block">School Management</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">Select Your Portal</h2>
            <p className="mt-1 text-sm text-gray-500 text-center">
              Choose your role to sign in
            </p>
          </div>

          <div className="space-y-3">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.role}
                  href={portal.href}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-150 group ${portal.color}`}
                >
                  <div className="flex-shrink-0">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{portal.label}</p>
                    <p className="text-sm text-gray-600 truncate">{portal.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-150">
            Return to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}