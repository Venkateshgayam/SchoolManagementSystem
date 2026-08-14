import RoleLoginForm from "@/components/auth/RoleLoginForm";

export default function StudentLoginPage() {
  return (
    <RoleLoginForm
      role="student"
      title="Student Sign in"
      subtitle="Access your student dashboard"
      placeholder="student@school.edu"
    />
  );
}
