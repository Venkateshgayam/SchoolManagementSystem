"use client";

import { useState, useEffect } from "react";
import { BookOpen, Tag, FileText } from "lucide-react";
import api from "@/lib/api";

interface SubjectRecord { id: number; name: string; code: string | null; description: string | null; created_at: string; }

export default function ManagementSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/subjects/").then((res) => setSubjects(res.data)).catch((err) => setError(err?.message || "Failed to load subjects")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading subjects…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subjects</h1>
      {subjects.length === 0 ? (
        <div className="card text-center py-8"><BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No subjects found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Tag className="h-4 w-4 inline mr-1 text-gray-400" />{s.code ? `${s.code} - ${s.name}` : s.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.code || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><FileText className="h-4 w-4 inline mr-1 text-gray-400" />{s.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{subjects.length} subject(s)</p>
        </div>
      )}
    </div>
  );
}
