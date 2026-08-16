"use client";

import { formatDate } from "@/lib/formatters";
import { useState, useEffect } from "react";
import PageLoader from "@/components/dashboard/PageLoader";
import StatCard from "@/components/dashboard/StatCard";
import { CreditCard, ClipboardList, FileText, AlertCircle, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { calculateAttendanceStats } from "@/lib/attendanceCalculations";

interface AttendanceRecord {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: string;
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

interface SubmissionRecord {
  id: number;
  assignment_id: number;
  student_id: number;
  submitted_at: string;
}

interface ExamRecord {
  id: number;
  name: string;
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
  total_fee: number;
  amount_paid: number;
  amount_due: number;
  late_fee_applied?: number;
  due_date: string | null;
  paid_date: string | null;
  status: string;
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
  const [assignmentsData, setAssignmentsData] = useState<AssignmentRecord[]>([]);
  const [submissionsData, setSubmissionsData] = useState<SubmissionRecord[]>([]);
  const [examsData, setExamsData] = useState<ExamRecord[]>([]);
  const [announcementsData, setAnnouncementsData] = useState<AnnouncementRecord[]>([]);
  const [notificationsData, setNotificationsData] = useState<NotificationRecord[]>([]);
  const [feesData, setFeesData] = useState<FeeRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [subjectsData, setSubjectsData] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { settings } = useSettings();
  const attendanceThreshold = settings.attendance_at_risk_threshold || 75;
  const currencySymbol = settings.currency_symbol || "$";
  const formatCurrency = (amount: number) =>
    `${currencySymbol}${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          attendanceRes,
          assignmentsRes,
          submissionsRes,
          examsRes,
          announcementsRes,
          notificationsRes,
          feesRes,
          studentRes,
          classesRes,
          subjectsRes,
        ] = await Promise.all([
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/assignment-submissions").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/notifications/").catch(() => ({ data: [] })),
          api.get("/fees/").catch(() => ({ data: [] })),
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
          setSubmissionsData(submissionsRes.data);

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

  const { rate: attendancePercent, present, late, absent } = calculateAttendanceStats(attendanceData);

  // Fee calculation aligned with /fees/ and StudentFeesPage
  const totalFees = feesData.reduce((sum, f) => sum + (f.total_fee || 0), 0);
  const paidFees = feesData.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
  const totalAmountDue = feesData.reduce(
    (sum, f) => sum + (f.amount_due !== undefined ? f.amount_due : Math.max(0, (f.total_fee || 0) - (f.amount_paid || 0))),
    0
  );

  let feesCardValue = "Paid";
  let feesCardTrend: React.ReactNode = "Up to date";

  if (feesData.length === 0) {
    feesCardValue = "Paid";
    feesCardTrend = "No fees assigned";
  } else if (totalAmountDue <= 0) {
    feesCardValue = "Paid";
    feesCardTrend = `${formatCurrency(paidFees)} paid`;
  } else {
    feesCardValue = `${formatCurrency(totalAmountDue)} due`;
    feesCardTrend = `${formatCurrency(paidFees)} paid`;
  }

  const upcomingExams = examsData.filter((e) => e.start_date && new Date(e.start_date) >= new Date());

  // Filter out assignments that have already been submitted by the student
  const submittedAssignmentIds = new Set(submissionsData.map((s) => s.assignment_id));
  const pendingAssignments = assignmentsData.filter(
    (a) => !submittedAssignmentIds.has(a.id)
  );

  const recentAnnouncements = [...announcementsData]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Attendance"
          value={`${attendancePercent}%`}
          icon={ClipboardList}
          trend={
            <div className="flex flex-col text-xs text-gray-500 mt-1">
              <span>P: {present} | L: {late} | A: {absent}</span>
              {attendancePercent < attendanceThreshold && (
                <span className="flex items-center text-red-600 font-medium mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Below {attendanceThreshold}%
                </span>
              )}
            </div>
          }
        />
        <StatCard
          title="Assignments"
          value={`${pendingAssignments.length} pending`}
          icon={FileText}
          trend={pendingAssignments.length === 0 ? "All caught up" : "Due soon"}
        />
        <StatCard
          title="Fees"
          value={feesCardValue}
          icon={CreditCard}
          trend={feesCardTrend}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                      {e.start_date && formatDate(e.start_date)}
                    </p>
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