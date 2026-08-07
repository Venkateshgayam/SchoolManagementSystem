import { Calendar, CheckCircle, Clock, FileText, MessageSquare, BookOpen, Award } from "lucide-react";

export default function Features() {
  const features = [
    { icon: Clock, title: "Digital Attendance", desc: "Track student attendance efficiently with real-time digital records." },
    { icon: BookOpen, title: "Academic Tracking", desc: "Monitor academic performance with detailed grade reports and analytics." },
    { icon: CheckCircle, title: "Online Assignments", desc: "Create, distribute, and collect assignments through a unified platform." },
    { icon: Calendar, title: "Timetable Management", desc: "Schedule and manage classes, exams, and school events effortlessly." },
    { icon: FileText, title: "Fee Tracking", desc: "Keep track of fee payments, pending dues, and financial reports." },
    { icon: MessageSquare, title: "Announcements", desc: "Share important updates and notifications with students and staff." },
    { icon: Award, title: "Secure Communication", desc: "Safe and reliable communication between teachers, students, and management." },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Why Choose Our School</h2>
          <p className="mt-4 text-lg text-gray-600">We provide comprehensive tools for modern education management.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="card">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}