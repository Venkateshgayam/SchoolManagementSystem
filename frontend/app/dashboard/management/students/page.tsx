"use client";

import { useState, useEffect } from "react";
import { Users, Search, Mail, BookOpen } from "lucide-react";
import api from "@/lib/api";

interface StudentRecord {
  id: number;
  roll_number: string | null;
  class_id: number | null;
  parent_email: string | null;
  enrollment_date: string;
  status: string;
}
interface ClassRecord { id: number; name: string; section: string | null; }

export default function ManagementStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [s, c] = await Promise.all([
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
        ]);
        setStudents(s.data); setClasses(c.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const filtered = search
    ? students.filter((s) => (s.roll_number || "").toLowerCase().includes(search.toLowerCase()))
    : students;

  const className = (classId: number | null) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : (classId === null ? "N/A" : `#${classId}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading students…</div></div>;
  }
  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Students</h1>
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" placeholder="Search roll number..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No students found.</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.roll_number || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{className(s.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Mail className="h-4 w-4 inline mr-1 text-gray-400" />{s.parent_email || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(s.enrollment_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
