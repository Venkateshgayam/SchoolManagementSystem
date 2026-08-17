"use client";

import Link from "next/link";
import { formatDate } from "@/lib/formatters";
import { useState, useEffect } from "react";
import PageLoader from "@/components/dashboard/PageLoader";
import StatCard from "@/components/dashboard/StatCard";
import { Users, BookOpen, ClipboardList, Calendar, Clock, MapPin, Megaphone, Bell, ArrowRight } from "lucide-react";
import api from "@/lib/api";

interface TeacherInfo {
  id: number;
  user_id: number;
  qualification: string | null;
  experience_years: number | null;
  employment_date: string;
  status: string;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
  academic_year: string | null;
  teacher_id: number | null;
  capacity: number | null;
}

interface StudentInfo {
  id: number;
  user_id: number;
  roll_number: string | null;
  class_id: number | null;
  status: string;
}

interface SubjectInfo {
  id: number;
  name: string;
  code: string | null;
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

interface AssignmentRecord {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  class_id: number | null;
  teacher_id: number | null;
  due_date: string | null;
  attachment_url: string | null;
  status?: string;
  created_at: string;
}

interface TeacherAssignment {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number | null;
  teacher_name?: string | null;
  class_name?: string | null;
  class_section?: string | null;
  subject_name?: string | null;
}

interface AnnouncementRecord {
  id: number;
  title: string;
  content: string;
  created_by: number | null;
  target_role: string | null;
  created_at: string;
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

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Map JS getDay() (0=Sun, 1=Mon, ..., 6=Sat) to Python day_of_week (0=Mon, ..., 6=Sun)
const dayMap: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          teacherRes,
          classesRes,
          studentsRes,
          subjectsRes,
          schedulesRes,
          assignmentsRes,
          teacherAssignmentsRes,
          announcementsRes,
          notificationsRes,
        ] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/teacher-class-assignments/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/notifications/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setStudents(studentsRes.data);
        setSubjects(subjectsRes.data);
        setSchedules(schedulesRes.data);
        setAssignments(assignmentsRes.data);
        setTeacherAssignments(teacherAssignmentsRes.data);
        setAnnouncements(announcementsRes.data);
        setNotifications(notificationsRes.data);
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
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600">Teacher profile not available.</p>
      </div>
    );
  }

  // 1. Assigned Classes calculation
  const myAssignments = teacherAssignments.filter((a) => a.teacher_id === teacher.id);
  const myAssignedClassIds = new Set<number>(myAssignments.map((a) => a.class_id));
  classes.forEach((c) => {
    if (c.teacher_id === teacher.id) {
      myAssignedClassIds.add(c.id);
    }
  });

  // 2. Total Students across all assigned classes
  const assignedStudents = students.filter((s) => s.class_id !== null && myAssignedClassIds.has(s.class_id));

  // 3. Schedules
  const teacherSchedules = schedules.filter((s) => s.teacher_id === teacher.id || (s.class_id && myAssignedClassIds.has(s.class_id)));
  const now = new Date();
  const todayDow = dayMap[now.getDay()];
  const todaySchedules = teacherSchedules
    .filter((s) => s.day_of_week === todayDow)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // 4. Upcoming Assignments (published only, due in future)
  const myTeacherAssignments = assignments.filter((a) => a.teacher_id === teacher.id);
  const upcomingAssignments = myTeacherAssignments.filter((a) => {
    const isPublished = !a.status || a.status === "published";
    const isFutureDue = a.due_date && new Date(a.due_date) >= now;
    return isPublished && isFutureDue;
  });

  const getSubjectName = (subjectId: number | null) => {
    if (subjectId === null) return "N/A";
    return subjects.find((s) => s.id === subjectId)?.name || `Subject ${subjectId}`;
  };

  const getClassName = (classId: number | null) => {
    if (classId === null) return "N/A";
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `Class ${classId}`;
  };

  const teacherAnnouncements = announcements.filter(
    (a) => a.target_role === "all" || a.target_role === "teachers" || a.target_role === null
  );

  const recentAnnouncements = [...teacherAnnouncements]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const teacherNotifications = notifications.filter((n) => n.user_id === teacher.user_id);
  const unreadNotifications = teacherNotifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Teacher Dashboard</h1>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Assigned Classes" value={myAssignedClassIds.size} icon={BookOpen} />
        <StatCard title="Total Students" value={assignedStudents.length} icon={Users} />
        <StatCard title="Today's Classes" value={todaySchedules.length} icon={Calendar} />
        <StatCard title="Upcoming Assignments" value={upcomingAssignments.length} icon={ClipboardList} />
      </div>

      {/* Main Grid: Today's Schedule + Announcements / Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Schedule Card (Spans 2 columns on large screens) */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              Today's Schedule ({dayNames[todayDow]})
            </h2>
            <Link
              href="/dashboard/teacher/schedule"
              className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
            >
              Full Timetable <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {todaySchedules.length === 0 ? (
            <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No classes scheduled for today.</p>
              <p className="text-xs text-gray-400 mt-1">Enjoy your free periods or prepare lessons!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      {s.start_time.slice(0, 5)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{getSubjectName(s.subject_id)}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-gray-700">{getClassName(s.class_id)}</span>
                        <span>·</span>
                        <span>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                        {s.room && (
                          <>
                            <span>·</span>
                            <span className="text-gray-600">Room {s.room}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/teacher/attendance?class_id=${s.class_id}`}
                    className="text-xs font-medium px-3 py-1.5 bg-white hover:bg-primary-50 text-primary-700 rounded border border-gray-200 hover:border-primary-300 transition-colors shadow-2xs"
                  >
                    Attendance
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Announcements & Notifications */}
        <div className="space-y-6">
          {/* Announcements Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary-600" />
                Announcements
              </h2>
              <Link
                href="/dashboard/teacher/announcements"
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                View all
              </Link>
            </div>
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-2">No new announcements.</p>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(a.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary-600" />
                Notifications
              </h2>
              {unreadNotifications > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {unreadNotifications} unread
                </span>
              )}
            </div>
            {teacherNotifications.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-2">No notifications.</p>
            ) : (
              <div className="space-y-3">
                {teacherNotifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="pb-2.5 border-b border-gray-100 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message || ""}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
