"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Calendar, BookOpen, Users } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

interface AttendanceRecord { id: number; student_id: number; class_id: number; date: string; status: string; marked_by: number | null; created_at: string; }
interface ClassRecord { id: number; name: string; section: string | null; }
interface StudentRecord { id: number; roll_number: string | null; class_id: number | null; }

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [a, c, s] = await Promise.all([
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
        ]);
        setAttendance(a.data); setClasses(c.data); setStudents(s.data);
      } catch (err: any) { setError(err?.message || "Failed to load attendance"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  const className = (classId: number) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `#${classId}`;
  };
  const studentLabel = (studentId: number) => {
    const s = students.find((st) => st.id === studentId);
    return s?.roll_number ? `#${s.roll_number}` : `#${studentId}`;
  };

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const rate = attendance.length === 0 ? 0 : (presentCount / attendance.length) * 100;
  const absentCount = attendance.filter((a) => a.status === "absent").length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading attendance…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="School-wide attendance records" icon={ClipboardList} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Records" value={attendance.length} icon={ClipboardList} />
        <StatCard title="Attendance Rate" value={`${rate.toFixed(1)}%`} icon={Calendar} trend={`${presentCount} present`} />
        <StatCard title="Absences" value={absentCount} icon={Users} />
      </div>
      {attendance.length === 0 ? (
        <div className="card text-center py-8"><ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No attendance records.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Users className="h-4 w-4 inline mr-1 text-gray-400" />{studentLabel(r.student_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{className(r.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={r.status} /></td>
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