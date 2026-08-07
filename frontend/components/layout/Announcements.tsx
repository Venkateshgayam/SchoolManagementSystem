import Image from "next/image";

export default function Announcements() {
  const announcements = [
    { title: "Welcome Back to the New Semester", date: "January 15, 2026", desc: "We are excited to welcome back all students and staff for the new semester.", image: "/images/events/annual-day.jpg" },
    { title: "Parent-Teacher Meetings Schedule", date: "January 20, 2026", desc: "Parent-teacher meetings will be held on February 5th. Please check your schedule.", image: "/images/events/school-event.jpg" },
    { title: "New Library Resources Available", date: "January 25, 2026", desc: "Our library has added new books and digital resources for student use.", image: "/images/facilities/library.jpg" },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Latest Announcements</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {announcements.map((ann) => (
            <div key={ann.title} className="card overflow-hidden">
              <div className="relative h-48 w-full">
                <Image
                  src={ann.image}
                  alt={ann.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <span className="badge badge-info mb-3">{ann.date}</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{ann.title}</h3>
                <p className="text-sm text-gray-600">{ann.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}