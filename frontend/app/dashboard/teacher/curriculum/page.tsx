"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import { BookOpen, UserCheck } from "lucide-react";
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
}

interface CurriculumInfo {
  id: number;
  class_id: number;
  subject_id: number;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function TeacherCurriculumPage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [curricula, setCurricula] = useState<CurriculumInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, subjectsRes, schedulesRes, curriculaRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/schedules/").catch(() => ({ data: [] })),
          api.get("/curriculum/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
        setSchedules(schedulesRes.data);
        setCurricula(curriculaRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load curriculum");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const teacherClasses = classes.filter((c) => c.teacher_id === teacher?.id);
  const taughtSubjectIds = new Set(
    schedules
      .filter((s) => s.teacher_id === teacher?.id)
      .map((s) => s.subject_id)
  );

  const myCurricula = curricula.filter(
    (c) => teacherClasses.some((cl) => cl.id === c.class_id) && taughtSubjectIds.has(c.subject_id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading curriculum...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Curriculum</h1>

      {myCurricula.length === 0 ? (
        <div className="card text-center py-10">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No curriculum found for your classes and subjects.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {myCurricula
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {subjects.find((s) => s.id === c.subject_id)?.name || `Subject #${c.subject_id}`} Curriculum
                    </h2>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      {classes.find((cl) => cl.id === c.class_id)
                        ? `${classes.find((cl) => cl.id === c.class_id)!.name} ${
                            classes.find((cl) => cl.id === c.class_id)!.section || ""
                          }`.trim()
                        : `Class #${c.class_id}`}
                      <span className="mx-1">·</span>
                      {subjects.find((s) => s.id === c.subject_id)?.name || `Subject #${c.subject_id}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    Updated {formatDate(c.updated_at || c.created_at)}
                  </span>
                </div>
                {c.description && <p className="text-gray-600 mt-3">{c.description}</p>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
