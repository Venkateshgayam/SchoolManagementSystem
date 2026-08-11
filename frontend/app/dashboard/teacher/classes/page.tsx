"use client";

import { useState, useEffect } from "react";
import { Users, BookOpen, UserCheck } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

interface TeacherInfo {
  id: number;
  user_id: number;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
  academic_year: string | null;
  teacher_id: number | null;
  capacity: number | null;
}

interface StudentInfo {
  id: number;
  roll_number: string | null;
  class_id: number | null;
  status: string;
  enrollment_date: string;
}

export default function TeacherClassesPage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, studentsRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setStudents(studentsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load classes");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading classes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600">Teacher profile not available.</p>
      </div>
    );
  }

  const teacherClasses = classes.filter((c) => c.teacher_id === teacher.id);
  const myStudents = students.filter((s) =>
    teacherClasses.some((c) => c.id === s.class_id)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Classes</h1>

      {teacherClasses.length === 0 ? (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No classes assigned to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {teacherClasses.map((c) => {
            const studentCount = students.filter((s) => s.class_id === c.id).length;
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {c.name} {c.section || ""}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {c.academic_year || "No academic year"}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {studentCount} students
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Capacity:</span> {c.capacity ?? "N/A"}
                  </div>
                  <div>
                    <span className="text-gray-500">Section:</span> {c.section || "N/A"}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/dashboard/teacher/attendance?class_id=${c.id}`}
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    Take Attendance
                  </Link>
                  <Link
                    href={`/dashboard/teacher/classes/${c.id}`}
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    View Students & Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
