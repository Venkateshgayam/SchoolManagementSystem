import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Activities | School Management System",
  description: "Explore student activities",
};

export default function StudentActivitiesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Activities</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          We offer a wide range of student activities to complement academic
          learning and foster personal growth.
        </p>
      </div>
    </div>
  );
}