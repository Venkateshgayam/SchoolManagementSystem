"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, MapPin } from "lucide-react";
import api from "@/lib/api";

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

interface SubjectInfo {
  id: number;
  name: string;
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const [scheduleRes, studentRes, subjectsRes] = await Promise.all([
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/students/me").catch(() => ({ data: null })),
          api.get("/subjects/").catch(() => ({ data: [] })),
        ]);

        const student = studentRes.data;
        const filteredSchedule = scheduleRes.data.filter(
          (s: ScheduleRecord) => s.class_id === student?.class_id
        );
        setSchedule(filteredSchedule);
        setSubjects(subjectsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load schedule");
      } finally {
        setLoading(false);
      }
    }

    fetchSchedule();
  }, []);

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || `Subject ${subjectId}`;
  };

  const groupedSchedule = schedule.reduce((acc: Record<number, ScheduleRecord[]>, s) => {
    if (!acc[s.day_of_week]) acc[s.day_of_week] = [];
    acc[s.day_of_week].push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading timetable...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Timetable</h1>

      {schedule.length === 0 ? (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No schedule entries found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedSchedule)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((day) => {
              const dayIndex = parseInt(day);
              const entries = groupedSchedule[dayIndex];
              return (
                <div key={day}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{dayNames[dayIndex]}</h2>
                  <div className="space-y-3">
                    {entries
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((entry) => (
                        <div key={entry.id} className="card flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-primary-600" />
                            <div>
                              <p className="font-medium text-gray-900">{getSubjectName(entry.subject_id)}</p>
                              <p className="text-sm text-gray-500">
                                {entry.start_time} - {entry.end_time}
                              </p>
                            </div>
                          </div>
                          {entry.room && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="h-4 w-4" /> {entry.room}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}