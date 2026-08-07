import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Announcements | School Management System",
  description: "View school announcements",
};

export default function AnnouncementsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Announcements</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Important announcements and updates from our school community.
        </p>
      </div>
    </div>
  );
}