"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, UserCheck, Copy } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";

interface ScheduleRecord { id: number; class_id: number; subject_id: number; teacher_id: number | null; room: string | null; day_of_week: number; start_time: string; end_time: string; academic_year: string | null; created_at: string; }
interface ClassRecord { id: number; name: string; section: string | null; }
interface SubjectRecord { id: number; name: string; code: string | null; }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [s, c, sub] = await Promise.all([
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
        ]);
        setSchedules(s.data); setClasses(c.data); setSubjects(sub.data);
      } catch (err: any) { setError(err?.message || "Failed to load schedules"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  const className = (id: number) => { const c = classes.find((cl) => cl.id === id); return c ? `${c.name} ${c.section || ""}`.trim() : `#${id}`; };
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name || `#${id}`;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading timetables…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader title="Schedules" subtitle="Class timetables across the school" icon={BookOpen} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Slots" value={schedules.length} icon={Copy} />
        <StatCard title="Classes Scheduled" value={new Set(schedules.map((s) => s.class_id)).size} icon={BookOpen} />
        <StatCard title="Subjects Covered" value={new Set(schedules.map((s) => s.subject_id)).size} icon={UserCheck} />
      </div>
      {schedules.length === 0 ? (
        <div className="card text-center py-8"><Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No schedules found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.slice().sort((a, b) => a.day_of_week - b.day_of_week || new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{DAYS[s.day_of_week] || `#${s.day_of_week}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{className(s.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{subjectName(s.subject_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Clock className="h-4 w-4 inline mr-1 text-gray-400" />{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.room || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><UserCheck className="h-4 w-4 inline mr-1 text-gray-400" />{s.teacher_id ? `#${s.teacher_id}` : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.academic_year || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{schedules.length} schedule slot(s)</p>
        </div>
      )}
    </div>
  );
}