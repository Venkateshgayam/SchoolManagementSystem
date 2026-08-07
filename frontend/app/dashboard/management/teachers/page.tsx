"use client";

import { useState, useEffect } from "react";
import { Users, UserCheck, Award, Calendar } from "lucide-react";
import api from "@/lib/api";

interface TeacherRecord {
  id: number;
  user_id: number;
  qualification: string | null;
  experience_years: number | null;
  employment_date: string;
  status: string;
  created_at: string;
}

export default function ManagementTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/teachers/").then((res) => setTeachers(res.data)).catch((err) => setError(err?.message || "Failed to load teachers")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading teachers…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Teachers</h1>
      {teachers.length === 0 ? (
        <div className="card text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No teachers found.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualification</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.user_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Award className="h-4 w-4 inline mr-1 text-gray-400" />{t.qualification || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.experience_years ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{new Date(t.employment_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${t.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{teachers.length} teacher(s)</p>
        </div>
      )}
    </div>
  );
}
