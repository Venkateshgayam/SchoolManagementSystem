import Image from "next/image";

export default function About() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">About Our School</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            We are committed to providing quality education and fostering a nurturing environment
            where every student can thrive and reach their full potential.
          </p>
        </div>
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          <div className="mb-8 lg:mb-0">
            <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/students/students-learning.jpg"
                alt="Students learning together in a classroom"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Our Mission", desc: "To provide quality education and foster a nurturing environment where every student can thrive." },
              { title: "Our Vision", desc: "To be a leading educational institution known for academic excellence and innovation." },
              { title: "Our Values", desc: "Excellence, integrity, respect, innovation, and community engagement." },
              { title: "Philosophy", desc: "A balanced approach combining academic rigor with creative exploration and character development." },
            ].map((item) => (
              <div key={item.title} className="card">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}