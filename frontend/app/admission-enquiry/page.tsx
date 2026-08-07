import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admission Enquiry | School Management System",
  description: "Get in touch for admission enquiries",
};

export default function AdmissionEnquiryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admission Enquiry</h1>
      <div className="card max-w-3xl">
        <p className="text-gray-600">
          Have questions about admissions? Reach out to our admissions team
          for guidance and support.
        </p>
      </div>
    </div>
  );
}