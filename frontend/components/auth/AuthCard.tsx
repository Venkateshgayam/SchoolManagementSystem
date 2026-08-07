"use client";

import Link from "next/link";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50/70 via-gray-50 to-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="bg-primary-600 text-white font-bold text-xl px-3 py-1 rounded-lg">SMS</div>
              <span className="text-lg font-semibold text-gray-900 hidden sm:block">School Management</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">{title}</h2>
            <p className="mt-1 text-sm text-gray-500 text-center">{subtitle}</p>
          </div>
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-150">
            Return to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
