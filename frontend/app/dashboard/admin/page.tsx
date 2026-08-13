"use client";

import { useState, useEffect } from "react";
import PageLoader from "@/components/dashboard/PageLoader";
import Link from "next/link";
import {
  Users, UserCheck, BookOpen, ClipboardList, AlertCircle, Clock, Bell,
  FileText, Wallet, Calendar, GraduationCap, LayoutDashboard, ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {   formatStudentNameId, formatTeacherNameId , formatDate } from "@/lib/formatters";
import { useSettings } from "@/hooks/useSettings";

interface StudentRecord { id: number; roll_number: string | null; class_id: number | null; status: string; full_name: string | null; }
interface TeacherRecord { id: number; user_id: number; qualification: string | null; experience_years: number | null; full_name: string | null; }
interface ClassRecord { id: number; name: string; section: string | null; teacher_id: number | null; }
interface SubjectRecord { id: number; name: string; code: string | null; }
interface ScheduleRecord { id: number; class_id: number; subject_id: number; day_of_week: number; start_time: string; end_time: string; room: string | null; }
interface AttendanceRecord { student_id: number; status: string; }
interface FeeRecord { amount: number; status: string; }
interface LeaveRequestRecord { id: number; student_id: number | null; teacher_id: number | null; status: string; from_date: string; to_date: string; }
interface ExamRecord { id: number; name: string; start_date: string | null; }
interface AnnouncementRecord { id: number; title: string; content: string; is_pinned: boolean; created_at: string; }
interface UserRecord { id: number; email: string; role: string; full_name: string; is_active: boolean; }

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const today = new Date().getDay();

export default function AdminDashboard() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    async function fetchAll() {
      try {
        const [s, t, c, subj, sch, att, fe, le, ex, ann, us] = await Promise.all([
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/teachers/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/fees/").catch(() => ({ data: [] })),
          api.get("/leave-requests/").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/users/").catch(() => ({ data: [] })),
        ]);
        setStudents(s.data); setTeachers(t.data); setClasses(c.data); setSubjects(subj.data);
        setSchedules(sch.data); setAttendance(att.data); setFees(fe.data); setLeaves(le.data);
        setExams(ex.data); setAnnouncements(ann.data); setUsers(us.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const attendanceRate =
    attendance.length === 0 ? 0 :
    // attendance.filter / attendance.length is a ratio; * 100 is a mathematical percentage-conversion constant
    (attendance.filter((a) => a.status === "present").length / attendance.length) * 100;
  const attendanceThreshold: number = settings.attendance_at_risk_threshold ?? 75;
  const attendanceTrend = attendance.length === 0
    ? "No data yet"
    : attendanceRate < attendanceThreshold
      ? `⚠ Below ${attendanceThreshold}% threshold`
      : `✓ Above ${attendanceThreshold}% threshold`;
  const revenue = fees.reduce((sum, f) => sum + (f.status === "PAID" ? f.amount : 0), 0);
  const pendingFees = fees.filter((f) => f.status === "PENDING" || f.status === "OVERDUE").length;
  const pendingLeaves = leaves.filter((l) => l.status === "PENDING");
  const upcomingExams = exams.filter((e) => e.start_date && new Date(e.start_date) >= new Date());
  const todaySchedules = schedules.filter((s) => s.day_of_week === today);


  const getSubjectName = (subjectId: number | null) =>
    subjects.find((s) => s.id === subjectId)?.name || `Subject #${subjectId}`;
  const getClassName = (classId: number | null) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `Class #${classId}`;
  };

  if (loading) return <PageLoader label="Loading dashboard..." />;
  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary-50 text-primary-700">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">School operations overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Active Students" value={students.filter((s) => s.status === "active").length} icon={GraduationCap} />
        <StatCard title="Total Teachers" value={teachers.length} icon={UserCheck} />
        <StatCard title="Total Classes" value={classes.length} icon={BookOpen} />
        <StatCard title="Total Subjects" value={subjects.length} icon={BookOpen} />
        <StatCard title="Total School Attendance" value={`${attendanceRate.toFixed(1)}%`} icon={ClipboardList} trend={attendanceTrend} />
        <StatCard title="Upcoming Exams" value={upcomingExams.length} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Today's Schedule</span>
            <Link href="/dashboard/admin/schedules" className="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </h2>
          {todaySchedules.length === 0 ? (
            <p className="text-gray-600">No classes scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {todaySchedules.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{getSubjectName(s.subject_id)}</span>
                  <span className="text-gray-600">{getClassName(s.class_id)}</span>
                  <span className="text-gray-600">{s.start_time} - {s.end_time}{s.room ? ` · ${s.room}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Pending Leave Requests</span>
            <Link href="/dashboard/admin/leave-requests" className="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </h2>
          {pendingLeaves.length === 0 ? (
            <p className="text-gray-600">No pending leave requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingLeaves.slice(0, 5).map((l) => {
                const s = l.student_id ? students.find(s => s.id === l.student_id) : null;
                const t = l.teacher_id ? teachers.find(t => t.id === l.teacher_id) : null;
                const nameStr = l.student_id ? formatStudentNameId(s?.full_name, l.student_id, s?.roll_number) : formatTeacherNameId(t?.full_name, l.teacher_id);
                return (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{nameStr}</span>
                    <span className="text-gray-500">{formatDate(l.from_date)} → {formatDate(l.to_date)}</span>
                    <StatusBadge status={l.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Upcoming Examinations</span>
            <Link href="/dashboard/admin/exams" className="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </h2>
          {upcomingExams.length === 0 ? (
            <p className="text-gray-600">No upcoming examinations.</p>
          ) : (
            <div className="space-y-2">
              {upcomingExams.slice(0, 5).map((e) => (
                <div key={e.id} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{e.name}</span>
                  <span className="text-gray-500">{e.start_date ? formatDate(e.start_date) : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{fees.filter((f) => f.status === "PAID").length}</p>
              <p className="text-sm text-gray-500">Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-danger-600">{pendingFees}</p>
              <p className="text-sm text-gray-500">Pending/Overdue</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 text-sm text-gray-600">
            <span className="font-medium">{students.length}</span> students
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Recent Announcements</span>
            <Link href="/dashboard/admin/announcements" className="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </h2>
          {announcements.length === 0 ? (
            <p className="text-gray-600">No announcements.</p>
          ) : (
            <div className="space-y-3">
              {announcements
                .slice()
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{a.title}{a.is_pinned && " 📌"}</p>
                      <p className="text-sm text-gray-600 truncate max-w-md">{a.content}</p>
                      <p className="text-xs text-gray-400">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}