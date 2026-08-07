import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fee Information | School Management System",
  description: "View fee structure and payment information",
};

export default function FeeInformationPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Fee Information</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Find detailed information about fee structures, payment methods,
          and financial assistance options.
        </p>
      </div>
    </div>
  );
}