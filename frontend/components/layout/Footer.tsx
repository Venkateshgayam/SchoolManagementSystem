"use client";

import Link from "next/link";
import { useSettings } from "@/hooks/useSettings";

export default function Footer() {
  const { settings } = useSettings();
  const schoolName = settings.school_name || "School Management System";
  const schoolInitials = schoolName.split(" ").map((w: string) => w[0]).join("").substring(0, 3).toUpperCase() || "SMS";

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="bg-primary-600 text-white font-bold text-lg px-3 py-1 rounded-lg inline-block">{schoolInitials}</div>
            <p className="mt-4 text-sm text-gray-400">
              {schoolName} — Modern education management platform dedicated to excellence.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-primary-400 transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-primary-400 transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-primary-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Academics</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/curriculum" className="hover:text-primary-400 transition-colors">Curriculum</Link></li>
              <li><Link href="/classes-subjects" className="hover:text-primary-400 transition-colors">Classes & Subjects</Link></li>
              <li><Link href="/examination" className="hover:text-primary-400 transition-colors">Examination</Link></li>
              <li><Link href="/academic-calendar" className="hover:text-primary-400 transition-colors">Academic Calendar</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {schoolName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}