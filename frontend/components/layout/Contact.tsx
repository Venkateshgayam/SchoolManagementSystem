export default function Contact() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Contact Us</h2>
          <p className="mt-4 text-lg text-gray-600">We&apos;d love to hear from you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
              <p className="text-gray-600">123 Education Street, Academic City, AC 12345</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
              <p className="text-gray-600">+1 (555) 123-4567</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
              <p className="text-gray-600">info@school.edu</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Working Hours</h3>
              <p className="text-gray-600">Monday - Friday: 8:00 AM - 4:00 PM</p>
            </div>
          </div>
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
    </section>
  );
}