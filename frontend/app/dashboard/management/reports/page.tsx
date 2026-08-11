"use client";

import { useState, useEffect } from "react";
import { Users, UserCheck, BookOpen, ClipboardList, BarChart3, Receipt, CalendarDays, Bell, FileText } from "lucide-react";
import api from "@/lib/api";

interface Student { id: number; user_id: number; roll_number: string | null; class_id: number | null; status: string; }
interface Teacher { id: number; }
interface ClassRecord { id: number; name: string; section: string | null; }
interface SubjectRecord { id: number; name: string; code: string | null; }
interface AttendanceRecord { status: string; }
interface GradeRecord { percentage: number | null; marks_obtained: number; total_marks: number; }
interface FeeRecord { status: string; amount_paid: number; amount_due: number; total_fee: number; }
interface LeaveRecord { status: string; }
interface AnnouncementRecord { is_pinned: boolean; }
interface NotificationRecord { is_read: boolean; }
interface AttendanceSummary { total: number; present: number; absent: number; rate: number; }

export default function ManagementReportsPage() {
  const [data, setData] = useState<Record<string, any>>({});
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [students, teachers, classes, subjects, attendance, grades, fees, leaves, announcements, notifications, attendanceSummaryRes] = await Promise.all([
          api.get("/students/").catch((e) => { console.error('/students/', e); return { data: [] }; }),
          api.get("/teachers/").catch((e) => { console.error('/teachers/', e); return { data: [] }; }),
          api.get("/classes/").catch((e) => { console.error('/classes/', e); return { data: [] }; }),
          api.get("/subjects/").catch((e) => { console.error('/subjects/', e); return { data: [] }; }),
          api.get("/attendance/").catch((e) => { console.error('/attendance/', e); return { data: [] }; }),
          api.get("/grades/").catch((e) => { console.error('/grades/', e); return { data: [] }; }),
          api.get("/fees/").catch((e) => { console.error('/fees/', e); return { data: [] }; }),
          api.get("/leave-requests/").catch((e) => { console.error('/leave-requests/', e); return { data: [] }; }),
          api.get("/announcements/").catch((e) => { console.error('/announcements/', e); return { data: [] }; }),
          api.get("/notifications/").catch((e) => { console.error('/notifications/', e); return { data: [] }; }),
          api.get("/reports/attendance-summary").catch((e) => { console.error('/reports/attendance-summary', e); return { data: null }; }),
        ]);
        setData({ students: students.data, teachers: teachers.data, classes: classes.data, subjects: subjects.data, attendance: attendance.data, grades: grades.data, fees: fees.data, leaves: leaves.data, announcements: announcements.data, notifications: notifications.data });
        setAttendanceSummary(attendanceSummaryRes.data || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load report data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const attendanceRate = attendanceSummary?.rate ?? (data.attendance?.length ? (data.attendance.filter((a: AttendanceRecord) => a.status === "present").length / data.attendance.length) * 100 : 0);
  const avgGrade = data.grades?.length ? data.grades.reduce((sum: number, g: GradeRecord) => sum + (g.percentage ?? (g.total_marks ? (g.marks_obtained / g.total_marks) * 100 : 0)), 0) / data.grades.length : 0;
  
  const revenue = Array.isArray(data.fees) ? data.fees.reduce((sum: number, f: any) => sum + (Number(f?.amount_paid) || 0), 0) : 0;
  const pendingFees = Array.isArray(data.fees) ? data.fees.reduce((sum: number, f: any) => sum + (Number(f?.amount_due) || 0), 0) : 0;
  const totalFeesExpected = revenue + pendingFees;
  const feesPaidPercentage = totalFeesExpected > 0 ? (revenue / totalFeesExpected) * 100 : 0;

  const pendingLeaves = (data.leaves || []).filter((l: LeaveRecord) => l.status === "pending").length;
  const pinnedAnnouncements = (data.announcements || []).filter((a: AnnouncementRecord) => a.is_pinned).length;
  const unreadNotifications = (data.notifications || []).filter((n: NotificationRecord) => !n.is_read).length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading reports…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card"><Users className="h-5 w-5 text-blue-600 mb-1" /><p className="text-2xl font-bold">{data.students?.length ?? 0}</p><p className="text-sm text-gray-600">Students</p></div>
        <div className="card"><UserCheck className="h-5 w-5 text-indigo-600 mb-1" /><p className="text-2xl font-bold">{data.teachers?.length ?? 0}</p><p className="text-sm text-gray-600">Teachers</p></div>
        <div className="card"><BookOpen className="h-5 w-5 text-purple-600 mb-1" /><p className="text-2xl font-bold">{data.classes?.length ?? 0}</p><p className="text-sm text-gray-600">Classes</p></div>
        <div className="card"><BookOpen className="h-5 w-5 text-teal-600 mb-1" /><p className="text-2xl font-bold">{data.subjects?.length ?? 0}</p><p className="text-sm text-gray-600">Subjects</p></div>
        <div className="card"><ClipboardList className="h-5 w-5 text-green-600 mb-1" /><p className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</p><p className="text-sm text-gray-600">Attendance Rate</p></div>
        <div className="card"><BarChart3 className="h-5 w-5 text-amber-600 mb-1" /><p className="text-2xl font-bold">{avgGrade.toFixed(2)}%</p><p className="text-sm text-gray-600">Avg Grade</p></div>
        <div className="card"><Receipt className="h-5 w-5 text-emerald-600 mb-1" /><p className="text-2xl font-bold">₹{revenue.toFixed(2)}</p><p className="text-sm text-gray-600">Collected Fees</p><p className="text-xs text-green-600 font-medium mt-1">{feesPaidPercentage.toFixed(1)}% of Total (₹{totalFeesExpected.toFixed(2)})</p></div>
        <div className="card"><Receipt className="h-5 w-5 text-red-600 mb-1" /><p className="text-2xl font-bold">₹{pendingFees.toFixed(2)}</p><p className="text-sm text-gray-600">Pending Fees</p></div>
        <div className="card"><CalendarDays className="h-5 w-5 text-yellow-600 mb-1" /><p className="text-2xl font-bold">{pendingLeaves}</p><p className="text-sm text-gray-600">Pending Leaves</p></div>
        <div className="card"><FileText className="h-5 w-5 text-pink-600 mb-1" /><p className="text-2xl font-bold">{(data.announcements || []).length}</p><p className="text-sm text-gray-600">Announcements</p><p className="text-xs text-gray-400">{pinnedAnnouncements} pinned</p></div>
        <div className="card"><Bell className="h-5 w-5 text-blue-500 mb-1" /><p className="text-2xl font-bold">{unreadNotifications}</p><p className="text-sm text-gray-600">Unread Notifications</p></div>
      </div>
    </div>
  );
}
