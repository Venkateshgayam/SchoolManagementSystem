import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Management | School Management System",
  description: "Learn about our school management team",
};

export default function ManagementPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">School Management</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Our management team is dedicated to ensuring the smooth operation of the school
          and providing the best possible environment for students and staff.
        </p>
      </div>
    </div>
  );
}