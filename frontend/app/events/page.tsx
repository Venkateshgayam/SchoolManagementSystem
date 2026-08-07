import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events | School Management System",
  description: "Stay updated with upcoming events",
};

export default function EventsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Events</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Stay informed about upcoming school events, celebrations, and
          activities throughout the year.
        </p>
      </div>
    </div>
  );
}