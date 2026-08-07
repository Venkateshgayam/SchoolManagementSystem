import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | School Management System",
  description: "Get in touch with our school",
};

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">School Information</h2>
          <div>
            <h3 className="font-medium text-gray-900">Address</h3>
            <p className="text-gray-600">123 Education Street, Academic City, AC 12345</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Phone</h3>
            <p className="text-gray-600">+1 (555) 123-4567</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Email</h3>
            <p className="text-gray-600">info@school.edu</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Working Hours</h3>
            <p className="text-gray-600">Monday - Friday: 8:00 AM - 4:00 PM</p>
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Send us a message</h2>
          <form className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input type="text" className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" placeholder="your@email.com" />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input-field" rows={4} placeholder="Your message" />
            </div>
            <button type="submit" className="btn-primary w-full">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}