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
                    href={`/dashboard/teacher/students`}
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    View Students
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Students</h2>
        {myStudents.length === 0 ? (
          <p className="text-gray-600">No students found in your classes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myStudents.map((s) => {
                  const cls = classes.find((c) => c.id === s.class_id);
                  const className = cls ? `${cls.name} ${cls.section || ""}`.trim() : "N/A";
                  return (
                    <tr key={s.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-gray-400" />
                        {s.roll_number || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{className}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(s.enrollment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            s.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {teacherClasses.length > 0 && (
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-5 w-5 text-gray-400" />
          <span>Showing {myStudents.length} student(s) across {teacherClasses.length} class(es).</span>
        </div>
      )}
    </div>
  );
}
