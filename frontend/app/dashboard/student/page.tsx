"use client";

import { formatDate } from "@/lib/formatters";
import { useState, useEffect } from "react";
import PageLoader from "@/components/dashboard/PageLoader";
import StatCard from "@/components/dashboard/StatCard";
import { BookOpen, CreditCard, ClipboardList, FileText, AlertCircle, Clock, Bell, TrendingUp, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";

interface AttendanceRecord {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: string;
}

interface GradeRecord {
  id: number;
  student_id: number;
  subject_id: number;
  exam_id: number | null;
  marks_obtained: number;
  total_marks: number;
  percentage: number | null;
  created_at: string;
}

interface AssignmentRecord {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  class_id: number | null;
  teacher_id: number | null;
  due_date: string | null;
  attachment_url: string | null;
  created_at: string;
}

interface ExamRecord {
  id: number;
  name: string;
  exam_type: string | null;
  start_date: string | null;
  end_date: string | null;
  academic_year: string | null;
}

interface AnnouncementRecord {
  id: number;
  title: string;
  content: string;
  created_by: number | null;
  target_role: string | null;
  created_at: string;
  expires_at: string | null;
  is_pinned: boolean;
}

interface NotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

interface FeeRecord {
  id: number;
  student_id: number;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: string;
  academic_year: string | null;
}

interface ScheduleRecord {
  id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number | null;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year: string | null;
}

interface StudentInfo {
  id: number;
  user_id: number;
  roll_number: string | null;
  class_id: number | null;
  parent_email: string | null;
  enrollment_date: string;
  status: string;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
}

interface SubjectInfo {
  id: number;
  name: string;
}

export default function StudentDashboard() {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [gradesData, setGradesData] = useState<GradeRecord[]>([]);
  const [assignmentsData, setAssignmentsData] = useState<AssignmentRecord[]>([]);
  const [examsData, setExamsData] = useState<ExamRecord[]>([]);
  const [announcementsData, setAnnouncementsData] = useState<AnnouncementRecord[]>([]);
  const [notificationsData, setNotificationsData] = useState<NotificationRecord[]>([]);
  const [feesData, setFeesData] = useState<FeeRecord[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [subjectsData, setSubjectsData] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { settings } = useSettings();
  const attendanceThreshold = settings.attendance_at_risk_threshold || 75;
  const currencySymbol = settings.currency_symbol || "$";

  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          attendanceRes,
          gradesRes,
          assignmentsRes,
          examsRes,
          announcementsRes,
          notificationsRes,
          feesRes,
          scheduleRes,
          studentRes,
          classesRes,
          subjectsRes,
        ] = await Promise.all([
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/grades/").catch(() => ({ data: [] })),
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/notifications/").catch(() => ({ data: [] })),
          api.get("/fees/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/students/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
        ]);

        const student = studentRes.data;
        if (student) {
          setStudentInfo(student);
          const sid = student.id;

          const attendance = attendanceRes.data.filter((r: AttendanceRecord) => r.student_id === sid);
          setAttendanceData(attendance);

          const grades = gradesRes.data.filter((r: GradeRecord) => r.student_id === sid);
          setGradesData(grades);

          const fees = feesRes.data.filter((r: FeeRecord) => r.student_id === sid);
          setFeesData(fees);

          const notifications = notificationsRes.data.filter(
            (r: NotificationRecord) => r.user_id === student.user_id
          );
          setNotificationsData(notifications);

          const assignments = assignmentsRes.data.filter(
            (r: AssignmentRecord) => r.class_id === student.class_id
          );
          setAssignmentsData(assignments);

          const schedules = scheduleRes.data.filter((r: ScheduleRecord) => r.class_id === student.class_id);
          setScheduleData(schedules);

          if (student.class_id && classesRes.data.length > 0) {
            const cls = classesRes.data.find((c: ClassInfo) => c.id === student.class_id);
            if (cls) setClassInfo(cls);
          }

          if (classesRes.data.length > 0 && subjectsRes.data.length > 0) {
            setSubjectsData(subjectsRes.data);
          }
        }

        setExamsData(examsRes.data);
        setAnnouncementsData(announcementsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  if (loading) return <PageLoader label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <AlertCircle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalAttendance = attendanceData.length;
  const presentCount = attendanceData.filter((r) => r.status === "present").length;
  const attendancePercent = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const totalFees = feesData.reduce((sum, f) => sum + f.amount, 0);
  const paidFees = feesData.filter((f) => f.status === "PAID").reduce((sum, f) => sum + f.amount, 0);
  const pendingFees = feesData.filter((f) => f.status === "PENDING").length;

  const upcomingExams = examsData.filter((e) => e.start_date && new Date(e.start_date) >= new Date());
  const pendingAssignments = assignmentsData.filter(
    (a) => a.due_date && new Date(a.due_date) >= new Date()
  );
  const unreadNotifications = notificationsData.filter((n) => !n.is_read).length;

  const today = new Date();
  const todaySchedule = scheduleData.filter((s) => {
const dayMap: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
        return s.day_of_week === dayMap[today.getDay()];
  });

  const recentGrades = [...gradesData]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentAnnouncements = [...announcementsData]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Attendance"
          value={`${attendancePercent}%`}
          icon={ClipboardList}
          trend={
            attendancePercent < attendanceThreshold ? (
              <span className="flex items-center text-red-600 font-medium">
                <AlertTriangle className="h-3 w-3 mr-1" /> Below {attendanceThreshold}%
              </span>
            ) : (
              `${presentCount} present`
            )
          }
        />
        <StatCard
          title="Grades"
          value={gradesData.length > 0 ? `${Math.round(gradesData.reduce((s, g) => s + (g.percentage || 0), 0) / gradesData.length)}%` : "N/A"}
          icon={BookOpen}
          trend={`${gradesData.length} grades`}
        />
        <StatCard
          title="Assignments"
          value={`${pendingAssignments.length} pending`}
          icon={FileText}
          trend="Due soon"
        />
        <StatCard
          title="Fees"
          value={pendingFees > 0 ? `${currencySymbol}${totalFees - paidFees} due` : "Paid"}
          icon={CreditCard}
          trend={pendingFees > 0 ? `${pendingFees} pending` : "Up to date"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
          {todaySchedule.length === 0 ? (
            <p className="text-gray-600">No classes scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Subject {s.subject_id}</p>
                    <p className="text-sm text-gray-500">
                      {s.start_time} - {s.end_time}
                      {s.room ? ` · Room ${s.room}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Announcements</h2>
          {recentAnnouncements.length === 0 ? (
            <p className="text-gray-600">No new announcements.</p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900">{a.title}</p>
                  <p className="text-sm text-gray-500">{a.content.slice(0, 100)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Exams</h2>
          {upcomingExams.length === 0 ? (
            <p className="text-gray-600">No upcoming exams.</p>
          ) : (
            <div className="space-y-3">
              {upcomingExams.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{e.name}</p>
                    <p className="text-sm text-gray-500">
                      {e.exam_type && `${e.exam_type} · `}
                      {e.start_date && formatDate(e.start_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Grades</h2>
          {recentGrades.length === 0 ? (
            <p className="text-gray-600">No grades yet.</p>
          ) : (
            <div className="space-y-3">
              {recentGrades.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Subject {g.subject_id}</p>
                    <p className="text-sm text-gray-500">
                      {g.marks_obtained}/{g.total_marks} ({g.percentage ? `${g.percentage}%` : "N/A"})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Assignments</h2>
        {pendingAssignments.length === 0 ? (
          <p className="text-gray-600">No pending assignments.</p>
        ) : (
          <div className="space-y-3">
            {pendingAssignments.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{a.title}</p>
                  <p className="text-sm text-gray-500">
                    Due: {a.due_date ? formatDate(a.due_date) : "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}