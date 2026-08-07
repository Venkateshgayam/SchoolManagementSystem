"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, UserCheck } from "lucide-react";
import api from "@/lib/api";

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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TODAY_DOW = new Date().getDay();
const WEEKDAYS = DAY_NAMES.slice(1, 6); // Monday-Friday

export default function TeacherSchedulePage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, subjectsRes, schedulesRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
        setSchedules(schedulesRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load schedule");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const teacherClasses = classes.filter((c) => c.teacher_id === teacher?.id);
  const mySchedules = schedules.filter((s) => s.teacher_id === teacher?.id);

  const visible = selectedClassId
    ? mySchedules.filter((s) => s.class_id === selectedClassId)
    : mySchedules;

  const grouped = (dow: number) =>
    visible
      .filter((s) => s.day_of_week === dow)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const today = DAY_NAMES[TODAY_DOW];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading schedule...</div>
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Schedule</h1>

      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-1">Filter by Class</label>
        <select
          value={selectedClassId ?? ""}
          onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
          className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All my classes</option>
          {teacherClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section || ""}
            </option>
          ))}
        </select>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Today ({today})
        </h2>
        {grouped(TODAY_DOW).length === 0 ? (
          <p className="text-gray-600">No classes scheduled for today.</p>
        ) : (
          <div className="space-y-3">
            {grouped(TODAY_DOW).map((s) => (
              <ScheduleRow key={s.id} schedule={s} classes={classes} subjects={subjects} />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" /> Weekly Timetable
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {WEEKDAYS.map((day) => {
                const dow = DAY_NAMES.indexOf(day);
                const daySchedules = grouped(dow);
                if (daySchedules.length === 0) return null;
                return daySchedules.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{day}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {subjects.find((sub) => sub.id === s.subject_id)?.name || `#${s.subject_id}`}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {classes.find((c) => c.id === s.class_id)
                        ? `${classes.find((c) => c.id === s.class_id)!.name} ${
                            classes.find((c) => c.id === s.class_id)!.section || ""
                          }`.trim()
                        : `#${s.class_id}`}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{s.room || "—"}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
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
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
      <div>
        <p className="font-medium text-gray-900">
          {sub ? `${sub.code ? sub.code + " — " : ""}${sub.name}` : `Subject #${schedule.subject_id}`}
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-4 mt-1">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> {schedule.start_time} - {schedule.end_time}
          </span>
          {cls && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {cls.name} {cls.section || ""}
            </span>
          )}
          {schedule.room && (
            <span className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" /> {schedule.room}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
