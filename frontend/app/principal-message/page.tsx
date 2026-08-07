import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Principal's Message | School Management System",
  description: "Read the principal's message",
};

export default function PrincipalMessagePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Principal&apos;s Message</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Welcome to our school. We are committed to providing a safe, supportive, and
          stimulating environment where every student can grow and succeed. Our dedicated
          staff works tirelessly to ensure that each student reaches their full potential.
        </p>
      </div>
    </div>
  );
}