"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import { Search, UserCheck, Mail, BookOpen, Eye } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

interface TeacherInfo {
  id: number;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
  teacher_id: number | null;
}

interface StudentInfo {
  id: number;
  user_id: number;
  roll_number: string | null;
  class_id: number | null;
  parent_email: string | null;
  enrollment_date: string;
  status: string;
}

export default function TeacherStudentsPage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [search, setSearch] = useState("");
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
        setError(err?.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading students...</div>
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

  const teacherClassIds = new Set(
    classes.filter((c) => c.teacher_id === teacher.id).map((c) => c.id)
  );
  const myStudents = students.filter((s) => (s.class_id ? teacherClassIds.has(s.class_id) : false));

  const filtered = search
    ? myStudents.filter((s) =>
        (s.roll_number || "").toLowerCase().includes(search.toLowerCase())
      )
    : myStudents;

  const getClassName = (classId: number | null) => {
    if (classId === null) return "N/A";
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `Class ${classId}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Students</h1>

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {search ? "No students matched your search." : "No students found in your classes."}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-gray-400" />
                      {s.roll_number || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />
                      {getClassName(s.class_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-4 w-4 text-gray-400" /> {s.parent_email || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(s.enrollment_date)}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/dashboard/teacher/students/${s.id}`}
                        className="text-primary-600 hover:text-primary-800 flex items-center justify-end gap-1"
                      >
                        <Eye className="h-4 w-4" /> View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-600">
        Showing {filtered.length} of {myStudents.length} student(s) in your classes.
      </p>
    </div>
  );
}
