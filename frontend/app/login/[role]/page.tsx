import { redirect, notFound } from "next/navigation";
import RoleLoginForm from "@/components/auth/RoleLoginForm";

const PUBLIC_ROLES: Record<string, { role: string; title: string; subtitle: string; placeholder: string }> = {
  student: {
    role: "student",
    title: "Student Sign in",
    subtitle: "Access your student dashboard",
    placeholder: "student@school.edu",
  },
  teacher: {
    role: "teacher",
    title: "Teacher Sign in",
    subtitle: "Access your teacher dashboard",
    placeholder: "teacher@school.edu",
  },
};

export default function RoleLoginPage({ params }: { params: { role: string } }) {
  const { role } = params;

  // Admin has a dedicated login URL; redirect there.
  if (role === "admin") {
    redirect("/admin/login");
  }

  // Legacy management / super-admin roles redirect to admin login.
  if (role === "management" || role === "super-admin" || role === "super_admin") {
    redirect("/admin/login");
  }

  const config = PUBLIC_ROLES[role];
  if (!config) {
    notFound();
  }

  return (
    <RoleLoginForm
      role={config.role}
      title={config.title}
      subtitle={config.subtitle}
      placeholder={config.placeholder}
    />
  );
}