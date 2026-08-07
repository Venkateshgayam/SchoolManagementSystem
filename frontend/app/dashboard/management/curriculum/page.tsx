"use client";

import { useState, useEffect } from "react";
import { BookOpen, BookMarked, Users, Clock } from "lucide-react";
import api from "@/lib/api";

interface CurriculumRecord { id: number; subject_id: number; class_id: number; description: string | null; teaching_hours: number | null; created_at: string; }
interface ClassRecord { id: number; name: string; section: string | null; }
interface SubjectRecord { id: number; name: string; code: string | null; }

export default function ManagementCurriculumPage() {
  const [curriculum, setCurriculum] = useState<CurriculumRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [c, cl, sub] = await Promise.all([
          api.get("/curriculum/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
        ]);
        setCurriculum(c.data); setClasses(cl.data); setSubjects(sub.data);
      } catch (err: any) { setError(err?.message || "Failed to load curriculum"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading curriculum…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Curriculum</h1>
      {curriculum.length === 0 ? (
        <div className="card text-center py-8"><BookMarked className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No curriculum found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teaching Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {curriculum.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{subjects.find((s) => s.id === c.subject_id)?.name || `#${c.subject_id}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{classes.find((cl) => cl.id === c.class_id) ? `${classes.find((cl) => cl.id === c.class_id)!.name} ${classes.find((cl) => cl.id === c.class_id)!.section || ""}`.trim() : `#${c.class_id}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Clock className="h-4 w-4 inline mr-1 text-gray-400" />{c.teaching_hours ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{curriculum.length} curriculum item(s)</p>
        </div>
      )}
    </div>
  );
}
