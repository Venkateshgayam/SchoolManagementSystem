"use client";

import { useState, useEffect } from "react";
import { BookOpen, GraduationCap, Save, PlusCircle } from "lucide-react";
import api from "@/lib/api";

interface TeacherInfo {
  id: number;
  user_id: number;
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

interface StudentInfo {
  id: number;
  roll_number: string | null;
  class_id: number | null;
}

interface GradeRecord {
  id: number;
  student_id: number;
  subject_id: number;
  class_id: number;
  grade_type: string;
  score: number;
  max_score: number;
  graded_by: number | null;
  created_at: string;
  updated_at: string | null;
}

interface ExamInfo {
  id: number;
  title: string;
  class_id: number | null;
  subject_id: number | null;
}

interface AssignmentInfo {
  id: number;
  title: string;
  class_id: number | null;
  subject_id: number | null;
}

const GRADE_TYPES = ["exam", "assignment", "project", "quiz"];

export default function TeacherGradesPage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [gradeType, setGradeType] = useState("exam");
  const [maxScore, setMaxScore] = useState("100");
  const [scores, setScores] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, subjectsRes, studentsRes, examsRes, assignmentsRes, gradesRes] =
          await Promise.all([
            api.get("/teachers/me").catch(() => ({ data: null })),
            api.get("/classes/").catch(() => ({ data: [] })),
            api.get("/subjects/").catch(() => ({ data: [] })),
            api.get("/students/").catch(() => ({ data: [] })),
            api.get("/exams/").catch(() => ({ data: [] })),
            api.get("/assignments/").catch(() => ({ data: [] })),
            api.get("/grades/").catch(() => ({ data: [] })),
          ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
        setStudents(studentsRes.data);
        setExams(examsRes.data);
        setAssignments(assignmentsRes.data);
        setGrades(gradesRes.data);

        const tClasses = classesRes.data.filter((c: ClassInfo) => c.teacher_id === teacherRes.data?.id);
        if (tClasses.length) setSelectedClassId(tClasses[0].id);
        if (subjectsRes.data.length) setSelectedSubjectId(subjectsRes.data[0].id);
      } catch (err: any) {
        setError(err?.message || "Failed to load grades");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const teacherClasses = classes.filter((c) => c.teacher_id === teacher?.id);
  const classStudents = selectedClassId
    ? students.filter((s) => s.class_id === selectedClassId)
    : [];

  const existingMap = selectedClassId && selectedSubjectId
    ? grades
        .filter(
          (g) => g.class_id === selectedClassId && g.subject_id === selectedSubjectId && g.grade_type === gradeType
        )
        .reduce((acc, g) => {
          acc[g.student_id] = g;
          return acc;
        }, {} as Record<number, GradeRecord>)
    : {};

  const saveGrades = async () => {
    if (!selectedClassId || !selectedSubjectId || !teacher) return;

    const ms = Number(maxScore);
    if (!ms || ms <= 0) return;

    const entries: { student_id: number; score: number }[] = [];
    for (const s of classStudents) {
      const val = scores[s.id];
      if (val !== undefined && val !== "") {
        const score = Number(val);
        if (!isNaN(score)) {
          entries.push({ student_id: s.id, score });
        }
      }
    }

    if (entries.length === 0) {
      setMessage("Enter at least one score to save.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      for (const entry of entries) {
        const existing = existingMap[entry.student_id];
        if (existing) {
          await api.put(`/grades/${existing.id}`, {
            score: entry.score,
            max_score: ms,
            graded_by: teacher.user_id,
          });
        } else {
          await api.post("/grades/", {
            student_id: entry.student_id,
            subject_id: selectedSubjectId,
            class_id: selectedClassId,
            grade_type: gradeType,
            score: entry.score,
            max_score: ms,
            graded_by: teacher.user_id,
          });
        }
      }
      setMessage(`Grades saved for ${entries.length} student(s).`);
      const res = await api.get("/grades/");
      setGrades(res.data);
      setScores({});
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || "Failed to save grades");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading grades...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Enter Grades</h1>

      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>
                Select class
              </option>
              {teacherClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section || ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
            <select
              value={selectedSubjectId ?? ""}
              onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>
                Select subject
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `${s.code} - ${s.name}` : s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
            <select
              value={gradeType}
              onChange={(e) => setGradeType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {GRADE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Max Score</label>
            <input
              type="number"
              min="1"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <button
              onClick={saveGrades}
              disabled={!selectedClassId || !selectedSubjectId || saving || classStudents.length === 0}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Grades"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`card mb-6 ${
            message.includes("Failed") || message.includes("Enter")
              ? "border-danger-200 bg-danger-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-sm ${
              message.includes("Failed") || message.includes("Enter") ? "text-danger-600" : "text-green-800"
            }`}
          >
            {message}
          </p>
        </div>
      )}

      {!selectedClassId ? (
        <div className="card text-center py-8">
          <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Select a class to enter grades.</p>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600">No students found in this class.</p>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {classes.find((c) => c.id === selectedClassId)
              ? `${classes.find((c) => c.id === selectedClassId)!.name} ${
                  classes.find((c) => c.id === selectedClassId)!.section || ""
                }`.trim()
              : "Class"}
            <span className="text-sm font-normal text-gray-500">
              — {subjects.find((s) => s.id === selectedSubjectId)?.name} · {gradeType}
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out of</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Existing</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classStudents.map((s) => {
                  const ex = existingMap[s.id];
                  const ms = Number(maxScore);
                  return (
                    <tr key={s.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.roll_number || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={ms}
                          step="0.1"
                          value={scores[s.id] ?? (ex ? String(ex.score) : "")}
                          onChange={(e) =>
                            setScores((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ms}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {ex ? `${ex.score}/${ex.max_score}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {teacherClasses.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Grades</h2>
          {grades.filter(
            (g) => teacherClasses.some((c) => c.id === g.class_id)
          ).length === 0 ? (
            <p className="text-gray-600">No recent grades.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades
                    .filter((g) => teacherClasses.some((c) => c.id === g.class_id))
                    .slice()
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10)
                    .map((g) => (
                      <tr key={g.id}>
                        <td className="px-4 py-2 text-gray-700">{g.student_id}</td>
                        <td className="px-4 py-2 text-gray-700">{subjects.find((s) => s.id === g.subject_id)?.name || `#${g.subject_id}`}</td>
                        <td className="px-4 py-2 text-gray-700">{classes.find((c) => c.id === g.class_id)?.name || `#${g.class_id}`}</td>
                        <td className="px-4 py-2 text-gray-700">{g.grade_type}</td>
                        <td className="px-4 py-2 text-gray-700 font-medium">{g.score}/{g.max_score}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
