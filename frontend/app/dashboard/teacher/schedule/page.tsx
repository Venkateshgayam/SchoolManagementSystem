"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, UserCheck, BookOpen } from "lucide-react";
import api from "@/lib/api";
import PageLoader from "@/components/dashboard/PageLoader";

interface TeacherInfo {
  id: number;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
  teacher_id: number | null;
}

interface SubjectInfo {
  id: number;
  name: string;
  code: string | null;
}

interface ScheduleInfo {
  id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TeacherAssignment {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number | null;
}

const DAYS = [
  { index: 0, name: "Monday" },
  { index: 1, name: "Tuesday" },
  { index: 2, name: "Wednesday" },
  { index: 3, name: "Thursday" },
  { index: 4, name: "Friday" },
  { index: 5, name: "Saturday" },
];

const dayMap: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

export default function TeacherSchedulePage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, subjectsRes, schedulesRes, assignmentsRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/teacher-class-assignments/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
        setSchedules(schedulesRes.data);
        setAssignments(assignmentsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load schedule");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  if (loading) return <PageLoader label="Loading schedule..." />;

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

  // Get assigned classes
  const myAssignments = assignments.filter((a) => a.teacher_id === teacher.id);
  const myAssignedClassIds = new Set<number>(myAssignments.map((a) => a.class_id));
  classes.forEach((c) => {
    if (c.teacher_id === teacher.id) {
      myAssignedClassIds.add(c.id);
    }
  });
  const teacherClasses = classes.filter((c) => myAssignedClassIds.has(c.id));

  // Teacher schedules
  const mySchedules = schedules.filter(
    (s) => s.teacher_id === teacher.id || (s.class_id && myAssignedClassIds.has(s.class_id))
  );

  const visible = selectedClassId
    ? mySchedules.filter((s) => s.class_id === selectedClassId)
    : mySchedules;

  const grouped = (dow: number) =>
    visible
      .filter((s) => s.day_of_week === dow)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const todayDow = dayMap[new Date().getDay()];
  const todayDayName = DAYS.find((d) => d.index === todayDow)?.name || "Today";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Schedule</h1>

      <div className="card mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filter by Class</label>
        <select
          value={selectedClassId ?? ""}
          onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
          className="input-field max-w-xs"
        >
          <option value="">All my assigned classes</option>
          {teacherClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section || ""}
            </option>
          ))}
        </select>
      </div>

      {/* Today's Schedule Box */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-600" /> Today ({todayDayName})
        </h2>
        {grouped(todayDow).length === 0 ? (
          <div className="py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped(todayDow).map((s) => (
              <ScheduleRow key={s.id} schedule={s} classes={classes} subjects={subjects} />
            ))}
          </div>
        )}
      </div>

      {/* Weekly Timetable */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary-600" /> Weekly Timetable
        </h2>
        <div className="space-y-6">
          {DAYS.map((day) => {
            const daySchedules = grouped(day.index);
            if (daySchedules.length === 0) return null;

            return (
              <div key={day.index} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                  {day.name}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {daySchedules.map((s) => (
                    <ScheduleRow key={s.id} schedule={s} classes={classes} subjects={subjects} />
                  ))}
                </div>
              </div>
            );
          })}
          {DAYS.every((day) => grouped(day.index).length === 0) && (
            <p className="text-gray-500 text-center py-6">No schedule entries found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({
  schedule,
  classes,
  subjects,
}: {
  schedule: ScheduleInfo;
  classes: ClassInfo[];
  subjects: SubjectInfo[];
}) {
  const cls = classes.find((c) => c.id === schedule.class_id);
  const sub = subjects.find((s) => s.id === schedule.subject_id);

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-2xs hover:border-gray-300 transition-colors">
      <p className="font-semibold text-gray-900 truncate">
        {sub ? sub.name : `Subject #${schedule.subject_id}`}
      </p>
      <div className="text-xs text-gray-500 flex flex-col gap-1 mt-1.5">
        <span className="flex items-center gap-1.5 font-medium text-gray-700">
          <Clock className="h-3.5 w-3.5 text-primary-600" />
          {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
        </span>
        {cls && (
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-gray-400" />
            {cls.name} {cls.section || ""}
          </span>
        )}
        {schedule.room && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            Room {schedule.room}
          </span>
        )}
      </div>
    </div>
  );
}
