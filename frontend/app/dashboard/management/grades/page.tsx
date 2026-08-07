"use client";

import { useState, useEffect } from "react";
import { BookOpen, BarChart3 } from "lucide-react";
import api from "@/lib/api";

interface GradeRecord { id: number; student_id: number; subject_id: number; exam_id: number | null; marks_obtained: number; total_marks: number; percentage: number | null; created_at: string; }
interface SubjectRecord { id: number; name: string; code: string | null; }
interface ExamRecord { id: number; name: string; }

export default function ManagementGradesPage() {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [g, s, ex] = await Promise.all([
          api.get("/grades/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] })),
        ]);
        setGrades(g.data); setSubjects(s.data); setExams(ex.data);
      } catch (err: any) { setError(err?.message || "Failed to load grades"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  const avg = grades.length === 0 ? 0 : grades.reduce((sum, g) => sum + (g.percentage ?? (g.total_marks ? (g.marks_obtained / g.total_marks) * 100 : 0)), 0) / grades.length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading grades…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Grades</h1>
      <div className="card mb-6">
        <p className="text-sm text-gray-600">Average across school: <span className="font-bold text-gray-900">{avg.toFixed(2)}%</span></p>
      </div>
      {grades.length === 0 ? (
        <div className="card text-center py-8"><BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No grades found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((g) => (
                  <tr key={g.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{g.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{subjects.find((s) => s.id === g.subject_id)?.name || `#${g.subject_id}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{g.exam_id ? (exams.find((e) => e.id === g.exam_id)?.name || `#${g.exam_id}`) : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{g.marks_obtained} / {g.total_marks}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{g.percentage ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(g.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{grades.length} grade(s)</p>
        </div>
      )}
    </div>
  );
}
