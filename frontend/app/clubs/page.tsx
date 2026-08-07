import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clubs & Co-curricular Activities | School Management System",
  description: "Explore our clubs and co-curricular activities",
};

export default function ClubsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Clubs &amp; Co-curricular Activities</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Join clubs and co-curricular activities to develop new skills,
          pursue your interests, and build lasting friendships.
        </p>
      </div>
    </div>
  );
}