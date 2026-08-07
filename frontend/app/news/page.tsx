import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News | School Management System",
  description: "Read the latest school news",
};

export default function NewsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">News</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Stay updated with the latest news and announcements from our school.
        </p>
      </div>
    </div>
  );
}