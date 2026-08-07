"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/dashboard/StatCard";
import { Users, BookOpen, ClipboardList, Calendar, Clock, MapPin } from "lucide-react";
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
  created_at: string;
}

interface GradeRecord {
  id: number;
  student_id: number;
  subject_id: number;
  exam_id: number | null;
  marks_obtained: number;
  total_marks: number;
  percentage: number | null;
  created_by: number | null;
  created_at: string;
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
const dayMap: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
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
          gradesRes,
          announcementsRes,
          notificationsRes,
        ] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/grades/").catch(() => ({ data: [] })),
          api.get("/announcements/").catch(() => ({ data: [] })),
          api.get("/notifications/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setStudents(studentsRes.data);
        setSubjects(subjectsRes.data);
        setSchedules(schedulesRes.data);
        setAssignments(assignmentsRes.data);
        setGrades(gradesRes.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading dashboard...</div>
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

  if (!teacher) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600">Teacher profile not available.</p>
      </div>
    );
  }

  const teacherClasses = classes.filter((c) => c.teacher_id === teacher.id);
  const myStudents = students.filter((s) =>
    teacherClasses.some((c) => c.id === s.class_id)
  );
  const teacherSchedules = schedules.filter((s) => s.teacher_id === teacher.id);
  const teacherAssignments = assignments.filter((a) => a.teacher_id === teacher.id);
  const teacherGrades = grades.filter((g) => g.created_by === teacher.user_id);
  const teacherNotifications = notifications.filter((n) => n.user_id === teacher.user_id);

  const now = new Date();
  const todayDow = dayMap[now.getDay()];
  const todaySchedules = teacherSchedules.filter((s) => s.day_of_week === todayDow);

  const upcomingAssignments = teacherAssignments.filter(
    (a) => a.due_date && new Date(a.due_date) >= now
  );

  const getSubjectName = (subjectId: number | null) => {
    if (subjectId === null) return "N/A";
    return subjects.find((s) => s.id === subjectId)?.name || `Subject ${subjectId}`;
  };

  const getClassName = (classId: number | null) => {
    if (classId === null) return "N/A";
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `Class ${classId}`;
  };

  const recentGrades = [...teacherGrades]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentAssignments = [...teacherAssignments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const unreadNotifications = teacherNotifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Teacher Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Assigned Classes" value={teacherClasses.length} icon={BookOpen} />
        <StatCard title="Total Students" value={myStudents.length} icon={Users} />
        <StatCard title="Today's Classes" value={todaySchedules.length} icon={Calendar} />
        <StatCard title="Upcoming Assignments" value={upcomingAssignments.length} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
          {todaySchedules.length === 0 ? (
            <p className="text-gray-600">No classes scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-gray-900">{getSubjectName(s.subject_id)}</p>
                      <p className="text-sm text-gray-500">
                        {s.start_time} - {s.end_time}
                        {s.room ? ` · Room ${s.room}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{dayNames[s.day_of_week]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignments</h2>
          {recentAssignments.length === 0 ? (
            <p className="text-gray-600">No assignments found.</p>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((a) => (
                <div key={a.id} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900">{a.title}</p>
                  <p className="text-sm text-gray-500">
                    {getSubjectName(a.subject_id)} · {getClassName(a.class_id)}
                  </p>
                  {a.due_date && (
                    <p className="text-sm text-gray-500">
                      Due: {new Date(a.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Classes</h2>
          {teacherClasses.length === 0 ? (
            <p className="text-gray-600">No classes assigned.</p>
          ) : (
            <div className="space-y-3">
              {teacherClasses.map((c) => {
                const studentCount = students.filter((s) => s.class_id === c.id).length;
                return (
                  <div key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {c.name} {c.section || ""}
                      </p>
                      <p className="text-sm text-gray-500">{studentCount} students</p>
                    </div>
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Grades</h2>
          {recentGrades.length === 0 ? (
            <p className="text-gray-600">No grades entered yet.</p>
          ) : (
            <div className="space-y-3">
              {recentGrades.map((g) => (
                <div key={g.id} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900">{getSubjectName(g.subject_id)}</p>
                  <p className="text-sm text-gray-500">
                    {g.marks_obtained}/{g.total_marks}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
          {teacherNotifications.length === 0 ? (
            <p className="text-gray-600">No notifications.</p>
          ) : (
            <div className="space-y-3">
              {teacherNotifications.slice(0, 5).map((n) => (
                <div key={n.id} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-500">{n.message?.slice(0, 80) || ""}</p>
                </div>
              ))}
            </div>
          )}
          {unreadNotifications > 0 && (
            <p className="text-xs text-primary-600 mt-2">{unreadNotifications} unread</p>
          )}
        </div>
      </div>
    </div>
  );
}
