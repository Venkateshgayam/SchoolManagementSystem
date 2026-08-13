import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import SiteShell from "@/components/layout/SiteShell";

import ClientTitleUpdater from "@/components/layout/ClientTitleUpdater";

export const metadata: Metadata = {
  title: "School Management System",
  description: "Modern school management and student information system",
  keywords: ["school", "management", "education", "student", "ERP"],
  openGraph: {
    title: "School Management System",
    description: "Modern school management and student information system",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 flex flex-col">
        <ClientTitleUpdater />
        <SiteShell>{children}</SiteShell>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </body>
    </html>
  );
}