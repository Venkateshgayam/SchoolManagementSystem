import { Users, BookOpen, GraduationCap, Award, TrendingUp } from "lucide-react";

export default function Statistics() {
  const stats = [
    { label: "Total Students", value: "1,250", icon: Users, change: "+8.2%", positive: true },
    { label: "Total Teachers", value: "85", icon: BookOpen, change: "+5.1%", positive: true },
    { label: "Total Classes", value: "42", icon: GraduationCap, change: "+3", positive: true },
    { label: "Years of Excellence", value: "25+", icon: Award, change: "", positive: true },
    { label: "Pass Rate", value: "98%", icon: TrendingUp, change: "", positive: true },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Our School at a Glance</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <stat.icon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="text-3xl font-bold text-primary-600">{stat.value}</div>
              <div className="mt-2 text-sm font-medium text-gray-900">{stat.label}</div>
              {stat.change && (
                <div className={`mt-1 text-xs font-medium ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                  {stat.change}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}