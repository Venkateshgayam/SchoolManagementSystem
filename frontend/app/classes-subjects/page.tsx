import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classes & Subjects | School Management System",
  description: "View our classes and subjects",
};

export default function ClassesSubjectsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Classes &amp; Subjects</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          We offer a wide range of classes and subjects to cater to diverse student
          interests and academic goals.
        </p>
      </div>
    </div>
  );
}