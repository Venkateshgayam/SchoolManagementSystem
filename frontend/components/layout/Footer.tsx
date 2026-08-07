"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getDashboardPath } from "@/lib/auth";

export default function Footer() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ role?: string } | null>(null);

  useEffect(() => {
    let parsed: { role?: string } | null = null;
    try {
      parsed = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      parsed = null;
    }
    setUser(parsed);
  }, [pathname]);

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="bg-primary-600 text-white font-bold text-lg px-3 py-1 rounded-lg inline-block">SMS</div>
            <p className="mt-4 text-sm text-gray-400">
              School Management System — Modern education management platform dedicated to excellence.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/" className="hover:text-primary-400 transition-colors">Home</a></li>
              <li><a href="/about" className="hover:text-primary-400 transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-primary-400 transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Academics</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/" className="hover:text-primary-400 transition-colors">Curriculum</a></li>
              <li><a href="/" className="hover:text-primary-400 transition-colors">Classes &amp; Subjects</a></li>
              <li><a href="/" className="hover:text-primary-400 transition-colors">Examination</a></li>
              <li><a href="/" className="hover:text-primary-400 transition-colors">Academic Calendar</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Portal</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                {user ? (
                  <Link href={getDashboardPath(user.role)} className="hover:text-primary-400 transition-colors">
                    Dashboard
                  </Link>
                ) : (
                  <Link href="/login" className="hover:text-primary-400 transition-colors">
                    Login
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} School Management System. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
