import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission & Vision | School Management System",
  description: "Learn about our school's mission and vision",
};

export default function MissionVisionPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mission &amp; Vision</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600">
            To provide quality education and foster a nurturing environment where every
            student can thrive and reach their full potential.
          </p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Vision</h2>
          <p className="text-gray-600">
            To be a leading educational institution known for academic excellence,
            innovation, and holistic student development.
          </p>
        </div>
      </div>
    </div>
  );
}