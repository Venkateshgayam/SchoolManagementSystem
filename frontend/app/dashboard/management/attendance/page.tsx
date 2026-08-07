"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Calendar, BookOpen } from "lucide-react";
import api from "@/lib/api";

interface AttendanceRecord { id: number; student_id: number; class_id: number; date: string; status: string; marked_by: number | null; created_at: string; }
interface ClassRecord { id: number; name: string; section: string | null; }

export default function ManagementAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [a, c] = await Promise.all([
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
        ]);
        setAttendance(a.data); setClasses(c.data);
      } catch (err: any) { setError(err?.message || "Failed to load attendance"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  const className = (classId: number) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `#${classId}`;
  };

  const rate =
    attendance.length === 0 ? 0 :
    (attendance.filter((a) => a.status === "present").length / attendance.length) * 100;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading attendance…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance</h1>
      <div className="card mb-6">
        <p className="text-sm text-gray-600">School-wide attendance rate: <span className="font-bold text-gray-900">{rate.toFixed(1)}%</span></p>
      </div>
      {attendance.length === 0 ? (
        <div className="card text-center py-8"><ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No attendance records.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked By</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{r.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{className(r.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${r.status === "present" ? "bg-green-100 text-green-800" : r.status === "absent" ? "bg-red-100 text-red-800" : r.status === "late" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>{r.status}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.marked_by ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{attendance.length} record(s)</p>
        </div>
      )}
    </div>
  );
}
