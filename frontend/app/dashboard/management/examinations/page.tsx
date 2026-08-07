"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, Tag, Award } from "lucide-react";
import api from "@/lib/api";

interface ExamRecord { id: number; name: string; exam_type: string | null; start_date: string | null; end_date: string | null; academic_year: string | null; created_at: string; }

export default function ManagementExaminationsPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/exams/").then((res) => setExams(res.data)).catch((err) => setError(err?.response?.data?.detail || err?.message || "Failed to load exams")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading examinations…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Examinations</h1>
      {exams.length === 0 ? (
        <div className="card text-center py-8"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No exams found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.slice().sort((a, b) => (b.start_date || "").localeCompare(a.start_date || "")).map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Tag className="h-4 w-4 inline mr-1 text-gray-400" />{e.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.exam_type || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{e.start_date ? new Date(e.start_date).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.end_date ? new Date(e.end_date).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.academic_year || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{exams.length} exam(s)</p>
        </div>
      )}
    </div>
  );
}
