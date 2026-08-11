"use client";

import { useState, useEffect } from "react";
import { Users, UserCheck, BookOpen, GraduationCap, ClipboardList, BarChart3, Receipt, ShieldCheck, Wallet, Megaphone } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";

interface Student { id: number; user_id: number; roll_number: string | null; class_id: number | null; status: string; }
interface Teacher { id: number; }
interface AttendanceRecord { status: string; }
interface GradeRecord { percentage: number | null; marks_obtained: number; total_marks: number; }
interface FeeRecord { status: string; amount_paid: number; amount_due: number; total_fee: number; }
interface LeaveRecord { status: string; }
interface AnnouncementRecord { is_pinned: boolean; }
interface UserRecord { role: string; is_active: boolean; }
interface AttendanceSummary { total: number; present: number; absent: number; rate: number; }

export default function AdminReportsPage() {
  const [data, setData] = useState<Record<string, any>>({});
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [students, teachers, classes, subjects, attendance, grades, fees, leaves, announcements, users, attendanceSummaryRes] = await Promise.all([
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/teachers/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/grades/").catch(() => ({ data: [] })),
          api.get("/fees/").catch(() => ({ data: [] })),
          api.get("/leave-requests/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/users/").catch(() => ({ data: [] })),
          api.get("/reports/attendance-summary").catch(() => ({ data: null })),
        ]);
        setData({ students: students.data, teachers: teachers.data, classes: classes.data, subjects: subjects.data, attendance: attendance.data, grades: grades.data, fees: fees.data, leaves: leaves.data, announcements: announcements.data, users: users.data });
        setAttendanceSummary(attendanceSummaryRes.data || null);
      } catch (err: any) { setError(err?.message || "Failed to load report data"); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const attendanceRate = attendanceSummary?.rate ?? (data.attendance?.length ? (data.attendance.filter((a: AttendanceRecord) => a.status === "present").length / data.attendance.length) * 100 : 0);
  const avgGrade = data.grades?.length ? data.grades.reduce((sum: number, g: GradeRecord) => sum + (g.percentage ?? (g.total_marks ? (g.marks_obtained / g.total_marks) * 100 : 0)), 0) / data.grades.length : 0;
  
  console.log("REPORTS DEBUG - fees:", data.fees);
  const revenue = Array.isArray(data.fees) ? data.fees.reduce((sum: number, f: any) => sum + (Number(f?.amount_paid) || 0), 0) : 0;
  const pendingFees = Array.isArray(data.fees) ? data.fees.reduce((sum: number, f: any) => sum + (Number(f?.amount_due) || 0), 0) : 0;
  const totalFeesExpected = revenue + pendingFees;
  const feesPaidPercentage = totalFeesExpected > 0 ? (revenue / totalFeesExpected) * 100 : 0;
  console.log("REPORTS DEBUG - calculated:", { revenue, pendingFees, totalFeesExpected, feesPaidPercentage });

  const pendingLeaves = (data.leaves || []).filter((l: LeaveRecord) => l.status === "pending").length;
  const totalAnnouncements = (data.announcements || []).length;
  const pinnedAnnouncements = (data.announcements || []).filter((a: AnnouncementRecord) => a.is_pinned).length;
  const staffCount = (data.users || []).filter((u: UserRecord) => u.role === "admin" || u.role === "super_admin" || u.role === "management" || u.role === "teacher").length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading reports…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader title="Reports" subtitle="School-wide operational summary" icon={BarChart3} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Students" value={data.students?.length ?? 0} icon={GraduationCap} />
        <StatCard title="Teachers" value={data.teachers?.length ?? 0} icon={UserCheck} />
        <StatCard title="Classes" value={data.classes?.length ?? 0} icon={Users} />
        <StatCard title="Subjects" value={data.subjects?.length ?? 0} icon={BookOpen} trend="available subjects" />
        <StatCard title="Attendance Rate" value={`${attendanceRate.toFixed(1)}%`} icon={ClipboardList} />
        <StatCard title="Average Grade" value={`${avgGrade.toFixed(2)}%`} icon={BarChart3} />
        <StatCard title="Collected Fees" value={`₹${revenue.toFixed(2)}`} icon={Receipt} trend={`${feesPaidPercentage.toFixed(1)}% of Total (₹${totalFeesExpected.toFixed(2)})`} />
        <StatCard title="Pending Fees" value={`₹${pendingFees.toFixed(2)}`} icon={Wallet} />
        <StatCard title="Pending Leave Requests" value={pendingLeaves} icon={ClipboardList} />
        <StatCard title="Announcements" value={totalAnnouncements} icon={Megaphone} trend={`${pinnedAnnouncements} pinned`} />
        <StatCard title="Staff Accounts" value={staffCount} icon={ShieldCheck} />
        <StatCard title="Attendance Records" value={data.attendance?.length ?? 0} icon={ClipboardList} trend={`${data.grades?.length ?? 0} grades recorded`} />
      </div>
    </div>
  );
}