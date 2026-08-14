import RoleLoginForm from "@/components/auth/RoleLoginForm";

export default function TeacherLoginPage() {
  return (
    <RoleLoginForm
      role="teacher"
      title="Teacher Sign in"
      subtitle="Access your teacher dashboard"
      placeholder="teacher@school.edu"
    />
  );
}
