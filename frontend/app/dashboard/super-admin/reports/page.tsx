"use client";

import { useState, useEffect } from "react";
import {
  Building2, Users, UserCheck, BookOpen, GraduationCap, Megaphone,
  ClipboardList, Wallet, FileText, ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";

interface SchoolRecord { id: number; name: string; established_year: number | null; created_at: string; }
interface UserRecord { id: number; role: string; is_active: boolean; created_at: string; }
interface StudentRecord { id: number; status: string; }
interface TeacherRecord { id: number; status: string; }
interface ClassRecord { id: number; name: string; }
interface SubjectRecord { id: number; name: string; }
interface AnnouncementRecord { id: number; is_pinned: boolean; created_at: string; }
interface AuditLogRecord { id: number; action: string; created_at: string; }
interface FeeRecord { id: number; amount: number; status: string; }

export default function SuperAdminReportsPage() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [sc, us, st, te, cl, su, an, lg, fe] = await Promise.all([
          api.get("/schools/").catch(() => ({ data: [] })),
          api.get("/users/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/teachers/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/audit-logs/").catch(() => ({ data: [] })),
          api.get("/fees/").catch(() => ({ data: [] })),
        ]);
        setSchools(sc.data);
        setUsers(us.data);
        setStudents(st.data);
        setTeachers(te.data);
        setClasses(cl.data);
        setSubjects(su.data);
        setAnnouncements(an.data);
        setLogs(lg.data);
        setFees(fe.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const roleCount = (role: string) => users.filter((u) => u.role === role).length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const activeStudents = students.filter((s) => s.status === "active").length;
  const activeTeachers = teachers.filter((t) => t.status === "active").length;
  const totalRevenue = fees.filter((f) => f.status === "paid").reduce((sum, f) => sum + f.amount, 0);
  const pendingFees = fees.filter((f) => f.status === "pending" || f.status === "overdue").length;
  const pinnedAnnouncements = announcements.filter((a) => a.is_pinned).length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading reports…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Schools" value={schools.length} icon={Building2} />
        <StatCard title="Users" value={users.length} icon={Users} />
        <StatCard title="Students" value={students.length} icon={GraduationCap} />
        <StatCard title="Teachers" value={teachers.length} icon={UserCheck} />
        <StatCard title="Classes" value={classes.length} icon={BookOpen} />
        <StatCard title="Subjects" value={subjects.length} icon={BookOpen} />
        <StatCard title="Announcements" value={announcements.length} icon={Megaphone} />
        <StatCard title="Audit Logs (recent)" value={logs.length} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Super Admins</span><span className="font-medium text-gray-900">{roleCount("super_admin")}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Admins</span><span className="font-medium text-gray-900">{roleCount("admin")}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Management</span><span className="font-medium text-gray-900">{roleCount("management")}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Teachers</span><span className="font-medium text-gray-900">{roleCount("teacher")}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Students</span><span className="font-medium text-gray-900">{roleCount("student")}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-600">Active accounts</span><span className="font-medium text-gray-900">{activeUsers} / {users.length}</span></div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrollment & Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Active students</span><span className="font-medium text-gray-900">{activeStudents} / {students.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Active teachers</span><span className="font-medium text-gray-900">{activeTeachers} / {teachers.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Pinned announcements</span><span className="font-medium text-gray-900">{pinnedAnnouncements}</span></div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{fees.filter((f) => f.status === "paid").length}</p>
              <p className="text-sm text-gray-500">Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{pendingFees}</p>
              <p className="text-sm text-gray-500">Pending/Overdue</p>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-3 text-sm text-gray-600 flex items-center gap-1">
            <Wallet className="h-4 w-4 text-gray-400" />
            <span className="font-medium">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> collected
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Activity</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Audit log entries (recent)</span><span className="font-medium text-gray-900">{logs.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Top action</span><span className="font-medium text-gray-900">{logs.length ? logs.map((l) => l.action).sort((a, b) => logs.filter((x) => x.action === b).length - logs.filter((x) => x.action === a).length)[0] : "—"}</span></div>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
            </tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Schools</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schools.length}</td></tr>
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Users</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{users.length}</td></tr>
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Students</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{students.length}</td></tr>
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Teachers</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teachers.length}</td></tr>
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Classes</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{classes.length}</td></tr>
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Subjects</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subjects.length}</td></tr>
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Announcements</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{announcements.length}</td></tr>
              <tr><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Fee records</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fees.length}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
