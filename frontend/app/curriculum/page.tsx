import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curriculum | School Management System",
  description: "Explore our academic curriculum",
};

export default function CurriculumPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Curriculum</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Our curriculum is designed to provide a well-rounded education that prepares
          students for success in academics and beyond.
        </p>
      </div>
    </div>
  );
}