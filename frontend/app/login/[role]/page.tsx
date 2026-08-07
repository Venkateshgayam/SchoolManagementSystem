import { redirect } from "next/navigation";

export default function RoleLoginRedirectPage() {
  redirect("/login");
}