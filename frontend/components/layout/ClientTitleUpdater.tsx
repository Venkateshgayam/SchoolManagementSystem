"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";

export default function ClientTitleUpdater() {
  const { settings, loading } = useSettings();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && settings.school_name) {
      // Small timeout to allow Next.js to set its own static title first
      setTimeout(() => {
        const currentTitle = document.title;
        if (currentTitle.includes("School Management System")) {
          document.title = currentTitle.replace("School Management System", settings.school_name);
        }
      }, 50);
    }
  }, [settings.school_name, loading, pathname]);

  return null;
}
