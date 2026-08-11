"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/change-password");
  }, [router]);

  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" aria-label="Loading" role="status" />
    </div>
  );
}