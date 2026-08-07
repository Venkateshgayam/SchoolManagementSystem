"use client";

import { useState, useEffect } from "react";
import { FileText, BookOpen, Calendar, UserCheck } from "lucide-react";
import api from "@/lib/api";

interface AssignmentRecord { id: number; title: string; description: string | null; subject_id: number; class_id: number; teacher_id: number | null; due_date: string; attachment_url: string | null; created_at: string; }
interface ClassRecord { id: number; name: string; section: string | null; }
interface SubjectRecord { id: number; name: string; code: string | null; }

export default function ManagementAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [a, c, s] = await Promise.all([
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
        ]);
        setAssignments(a.data); setClasses(c.data); setSubjects(s.data);
      } catch (err: any) { setError(err?.message || "Failed to load assignments"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  const className = (id: number) => { const c = classes.find((cl) => cl.id === id); return c ? `${c.name} ${c.section || ""}`.trim() : `#${id}`; };
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name || `#${id}`;

  const now = new Date();
  const overdue = assignments.filter((a) => new Date(a.due_date) < now);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading assignments…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assignments</h1>
      <div className="card mb-6">
        <p className="text-sm text-gray-600">Overdue: <span className="font-bold text-red-600">{overdue.length}</span></p>
      </div>
      {assignments.length === 0 ? (
        <div className="card text-center py-8"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No assignments found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.slice().sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()).map((a) => (
                  <tr key={a.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{subjectName(a.subject_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{className(a.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><UserCheck className="h-4 w-4 inline mr-1 text-gray-400" />{a.teacher_id ? `#${a.teacher_id}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{assignments.length} assignment(s)</p>
        </div>
      )}
    </div>
  );
}
