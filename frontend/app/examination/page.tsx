import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Examination | School Management System",
  description: "Learn about our examination system",
};

export default function ExaminationPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Examination</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Our examination system is designed to assess student progress fairly and
          comprehensively throughout the academic year.
        </p>
      </div>
    </div>
  );
}