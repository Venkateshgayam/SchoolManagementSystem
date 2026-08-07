import Image from "next/image";

export default function StudentLife() {
  const activities = [
    { title: "Student Activities", desc: "A vibrant community of student-led clubs, societies, and initiatives.", image: "/images/students/student-activities.jpg" },
    { title: "Sports", desc: "Encouraging teamwork, discipline, and physical fitness through diverse sports.", image: "/images/students/students-sports.jpg" },
    { title: "Clubs & Co-curricular", desc: "From debate to drama, music to robotics — explore your passions.", image: "/images/students/students-learning.jpg" },
    { title: "Events", desc: "Annual day, sports day, cultural festivals, and more throughout the year.", image: "/images/events/school-event.jpg" },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Student Life</h2>
          <p className="mt-4 text-lg text-gray-600">Beyond academics, we nurture talent, character, and leadership.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {activities.map((activity) => (
            <div key={activity.title} className="card overflow-hidden">
              <div className="relative h-48 w-full">
                <Image
                  src={activity.image}
                  alt={activity.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{activity.title}</h3>
                <p className="text-sm text-gray-600">{activity.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}