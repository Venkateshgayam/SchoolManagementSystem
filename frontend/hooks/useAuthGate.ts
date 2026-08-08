import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getDashboardPath } from "@/lib/auth";

export type AuthGateState = "checking" | "guest" | "authenticated";

const knownRoles = ["student", "teacher", "management", "admin", "super_admin"];

export function useAuthGate(): AuthGateState {
  const router = useRouter();
  const [state, setState] = useState<AuthGateState>("checking");

  useEffect(() => {
    const user = getUser();
    const role = user?.role;
    if (role && knownRoles.includes(role)) {
      setState("authenticated");
      router.replace(getDashboardPath(role));
    } else {
      setState("guest");
    }
  }, [router]);

  return state;
}