import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admissions | School Management System",
  description: "Learn about our admissions process",
};

export default function AdmissionsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admissions</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          We welcome applications from students of all backgrounds. Our
          admissions process is designed to be transparent and accessible.
        </p>
      </div>
    </div>
  );
}