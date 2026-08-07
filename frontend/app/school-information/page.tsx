import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Information | School Management System",
  description: "Find important information about our school",
};

export default function SchoolInformationPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">School Information</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Greenfield Academy is a modern educational institution committed to academic
          excellence and holistic student development.
        </p>
      </div>
    </div>
  );
}