import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | School Management System",
  description: "Learn about our school's mission, vision, and values",
};

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">About Our School</h1>
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
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Values</h2>
          <ul className="space-y-2 text-gray-600">
            <li>Excellence in education</li>
            <li>Integrity and transparency</li>
            <li>Respect and inclusivity</li>
            <li>Innovation and creativity</li>
            <li>Community engagement</li>
          </ul>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Academic Philosophy</h2>
          <p className="text-gray-600">
            We believe in a balanced approach to education that combines academic rigor
            with creative exploration, critical thinking, and character development.
          </p>
        </div>
      </div>
    </div>
  );
}