import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academic Calendar | School Management System",
  description: "View our academic calendar",
};

export default function AcademicCalendarPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Academic Calendar</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Stay updated with important dates, events, and holidays throughout the
          academic year.
        </p>
      </div>
    </div>
  );
}