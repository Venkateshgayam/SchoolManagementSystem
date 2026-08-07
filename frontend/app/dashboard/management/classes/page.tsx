"use client";

import { useState, useEffect } from "react";
import { BookOpen, Users, Award } from "lucide-react";
import api from "@/lib/api";

interface ClassRecord { id: number; name: string; section: string | null; academic_year: string | null; teacher_id: number | null; capacity: number | null; }
interface TeacherRecord { id: number; }

export default function ManagementClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [c, t] = await Promise.all([
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/teachers/").catch(() => ({ data: [] })),
        ]);
        setClasses(c.data); setTeachers(t.data);
      } catch (err: any) { setError(err?.message || "Failed to load classes"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading classes…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Classes</h1>
      {classes.length === 0 ? (
        <div className="card text-center py-8"><BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No classes found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Teacher</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.section || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.academic_year || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.capacity ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.teacher_id ? `Teacher #${c.teacher_id}` : "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{classes.length} class(es)</p>
        </div>
      )}
    </div>
  );
}
