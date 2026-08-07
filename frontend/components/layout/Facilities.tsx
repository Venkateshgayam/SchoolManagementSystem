import Image from "next/image";

export default function Facilities() {
  const facilities = [
    { title: "Smart Classrooms", desc: "Modern interactive classrooms equipped with digital learning tools.", image: "/images/facilities/classroom.jpg" },
    { title: "Computer Labs", desc: "Well-equipped labs with the latest technology for practical learning.", image: "/images/facilities/computer-lab.jpg" },
    { title: "Science Laboratories", desc: "Fully equipped labs for physics, chemistry, and biology experiments.", image: "/images/facilities/science-lab.jpg" },
    { title: "Library", desc: "A vast collection of books, journals, and digital resources for research.", image: "/images/facilities/library.jpg" },
    { title: "Sports Facilities", desc: "Dedicated spaces for cricket, football, basketball, and athletics.", image: "/images/students/students-sports.jpg" },
    { title: "Campus Grounds", desc: "Spacious and green campus designed for a conducive learning environment.", image: "/images/hero/school-campus.jpg" },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Our Facilities</h2>
          <p className="mt-4 text-lg text-gray-600">World-class infrastructure to support every aspect of learning.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {facilities.map((facility) => (
            <div key={facility.title} className="card overflow-hidden">
              <div className="relative h-48 w-full">
                <Image
                  src={facility.image}
                  alt={facility.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{facility.title}</h3>
                <p className="text-sm text-gray-600">{facility.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}