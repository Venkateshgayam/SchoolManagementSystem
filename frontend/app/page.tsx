import Hero from "@/components/layout/Hero";
import About from "@/components/layout/About";
import Features from "@/components/layout/Features";
import Statistics from "@/components/layout/Statistics";
import Facilities from "@/components/layout/Facilities";
import StudentLife from "@/components/layout/StudentLife";
import Announcements from "@/components/layout/Announcements";
import Contact from "@/components/layout/Contact";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <About />
      <Statistics />
      <Features />
      <Facilities />
      <StudentLife />
      <Announcements />
      <Contact />
    </div>
  );
}