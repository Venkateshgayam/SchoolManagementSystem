import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sports | School Management System",
  description: "View our sports programs",
};

export default function SportsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Sports</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Our sports programs promote teamwork, discipline, and healthy
          lifestyles among students.
        </p>
      </div>
    </div>
  );
}