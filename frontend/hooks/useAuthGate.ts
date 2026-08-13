import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getDashboardPath, normalizeRole } from "@/lib/auth";

export type AuthGateState = "checking" | "guest" | "authenticated";

// Final 3 canonical roles (legacy roles are normalised inside getDashboardPath)
const KNOWN_ROLES = ["student", "teacher", "admin", "management", "super_admin", "superadmin"];

export function useAuthGate(): AuthGateState {
  const router = useRouter();
  const [state, setState] = useState<AuthGateState>("checking");

  useEffect(() => {
    const user = getUser();
    const rawRole = user?.role;
    // Accept any known or legacy role; getDashboardPath normalises it
    if (rawRole && KNOWN_ROLES.includes(rawRole)) {
      const role = normalizeRole(rawRole) ?? rawRole;
      setState("authenticated");
      router.replace(getDashboardPath(role));
    } else {
      setState("guest");
    }
  }, [router]);

  return state;
}