"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, getDashboardPath } from "@/lib/auth";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    const role = user?.role;
    router.replace(getDashboardPath(role));
  }, [router]);

  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" aria-label="Loading" role="status" />
    </div>
  );
}