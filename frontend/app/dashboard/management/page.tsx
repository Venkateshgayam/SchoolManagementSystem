"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, BookOpen, GraduationCap, Calendar, AlertCircle, Clock, Bell,
  FileText, ClipboardCheck, Wallet, TrendingUp, CalendarCheck,
} from "lucide-react";
import api from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";

interface StudentRecord { id: number; roll_number: string | null; class_id: number | null; status: string; }
interface TeacherRecord { id: number; user_id: number; qualification: string | null; experience_years: number | null; }
interface ClassRecord { id: number; name: string; section: string | null; teacher_id: number | null; }
interface SubjectRecord { id: number; name: string; code: string | null; }
interface ScheduleRecord {
  id: number; class_id: number; subject_id: number; teacher_id: number | null;
  room: string | null; day_of_week: number; start_time: string; end_time: string;
}
interface AttendanceRecord { student_id: number; status: string; }
interface GradeRecord { marks_obtained: number; total_marks: number; percentage: number | null; }
interface FeeRecord { amount: number; status: string; }
interface LeaveRequestRecord { student_id: number; status: string; }
interface ExamRecord { name: string; start_date: string | null; }
interface AssignmentRecord { title: string; due_date: string | null; }
interface AnnouncementRecord { id: number; title: string; content: string; target_role: string | null; is_pinned: boolean; created_at: string; }
interface NotificationRecord { is_read: boolean; }

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const today = new Date().getDay();

export default function ManagementDashboard() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          s, t, c, subj, sch, att, gr, fe, le, ex, asg, ann, notif,
        ] = await Promise.all([
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/teachers/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/grades/").catch(() => ({ data: [] })),
          api.get("/fees/").catch(() => ({ data: [] })),
          api.get("/leave-requests/").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] })),
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/notifications/").catch(() => ({ data: [] })),
        ]);
        setStudents(s.data); setTeachers(t.data); setClasses(c.data); setSubjects(subj.data);
        setSchedules(sch.data); setAttendance(att.data); setGrades(gr.data); setFees(fe.data);
        setLeaves(le.data); setExams(ex.data); setAssignments(asg.data); setAnnouncements(ann.data);
        setNotifications(notif.data);
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
    (attendance.filter((a) => a.status === "present").length / attendance.length) * 100;
  const avgPct = grades.length === 0 ? 0 :
    grades.reduce((sum, g) => sum + (g.percentage ?? (g.total_marks ? (g.marks_obtained / g.total_marks) * 100 : 0)), 0) / grades.length;
  const revenue = fees.reduce((sum, f) => sum + (f.status === "paid" ? f.amount : 0), 0);
  const pendingFees = fees.filter((f) => f.status === "pending" || f.status === "overdue").length;
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const todaySchedules = schedules.filter((s) => s.day_of_week === today);
  const upcomingExams = exams.filter((e) => e.start_date && new Date(e.start_date) >= new Date());
  const overdueAssignments = assignments.filter(
    (a) => a.due_date && new Date(a.due_date) < new Date()
  ).length;

  const getClassName = (classId: number | null) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `Class #${classId}`;
  };
  const getSubjectName = (subjectId: number | null) =>
    subjects.find((s) => s.id === subjectId)?.name || `Subject #${subjectId}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading dashboard…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Management Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Students" value={students.length} icon={GraduationCap} />
        <StatCard title="Total Teachers" value={teachers.length} icon={Users} />
        <StatCard title="Total Classes" value={classes.length} icon={BookOpen} />
        <StatCard title="Total Subjects" value={subjects.length} icon={BookOpen} />
        <StatCard title="Attendance Rate" value={`${attendanceRate.toFixed(1)}%`} icon={ClipboardCheck} trend="+1.2%" />
        <StatCard title="Average Grade" value={`${avgPct.toFixed(1)}%`} icon={TrendingUp} trend="+0.3" />
        <StatCard title="Revenue (Paid)" value={`$${revenue.toLocaleString()}`} icon={Wallet} />
        <StatCard title="Pending Leaves" value={pendingLeaves} icon={AlertCircle} />
        <StatCard title="Overdue Assignments" value={overdueAssignments} icon={Clock} />
        <StatCard title="Unread Notifications" value={unreadNotifications} icon={Bell} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
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
            <Link href="/dashboard/management/leave-requests" className="text-sm text-primary-600 hover:text-primary-500">View all</Link>
          </h2>
          {pendingLeaves === 0 ? (
            <p className="text-gray-600">No pending leave requests.</p>
          ) : (
            <div className="space-y-2">
              {leaves.filter((l) => l.status === "pending").map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Student #{l.student_id}</span>
                  <span className="text-gray-500">{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Upcoming Examinations</span>
            <Link href="/dashboard/management/examinations" className="text-sm text-primary-600 hover:text-primary-500">View all</Link>
          </h2>
          {upcomingExams.length === 0 ? (
            <p className="text-gray-600">No upcoming examinations.</p>
          ) : (
            <div className="space-y-2">
              {upcomingExams.map((e) => (
                <div key={e.name} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{e.name}</span>
                  <span className="text-gray-500">{e.start_date ? new Date(e.start_date).toLocaleDateString() : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{fees.filter((f) => f.status === "paid").length}</p>
              <p className="text-sm text-gray-500">Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-danger-600">{pendingFees}</p>
              <p className="text-sm text-gray-500">Pending/Overdue</p>
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Recent Announcements</span>
            <Link href="/dashboard/management/announcements" className="text-sm text-primary-600 hover:text-primary-500">View all</Link>
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
                      <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</p>
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
