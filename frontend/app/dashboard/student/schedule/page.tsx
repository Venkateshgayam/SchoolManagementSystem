"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, MapPin, Calendar } from "lucide-react";
import api from "@/lib/api";
import PageLoader from "@/components/dashboard/PageLoader";

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

  if (loading) return <PageLoader label="Loading timetable..." />;

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Class Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">Weekly schedule of periods and classrooms</p>
      </div>

      {schedule.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">No Schedule Available</h3>
          <p className="text-sm text-gray-500">Your class timetable has not been published yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedSchedule)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((day) => {
              const dayIndex = parseInt(day);
              const entries = groupedSchedule[dayIndex];
              return (
                <div key={day} className="card">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-600"></span>
                    {dayNames[dayIndex]}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {entries
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 shadow-2xs hover:border-gray-300 transition-colors"
                        >
                          <p className="font-semibold text-gray-900 text-sm">
                            {getSubjectName(entry.subject_id)}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <Clock className="h-3.5 w-3.5 text-primary-600" />
                              {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                            </span>
                            {entry.room && (
                              <span className="flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                                <MapPin className="h-3 w-3 text-gray-400" /> Room {entry.room}
                              </span>
                            )}
                          </div>
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