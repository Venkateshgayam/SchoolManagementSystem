"use client";

import Image from "next/image";
import { useSettings } from "@/hooks/useSettings";

export default function Hero() {
  const { settings } = useSettings();
  const schoolName = settings.school_name || "School Management System";

  return (
    <section className="relative bg-gradient-to-br from-primary-700 to-primary-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {schoolName}
            </h1>
            <p className="mt-6 text-lg text-primary-100 max-w-3xl">
              A modern, comprehensive platform for managing your school&apos;s operations �?" from student
              enrollment to academic tracking, attendance, and beyond.
            </p>
          </div>
          <div className="mt-10 lg:mt-0">
            <div className="relative h-56 sm:h-72 lg:h-80 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/hero/school-campus.jpg"
                alt="Aerial view of our school campus"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}