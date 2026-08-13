"use client";

import { useState, useEffect } from "react";
import { BookOpen, GraduationCap, Save, PlusCircle } from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";

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
  full_name?: string;
}

interface GradeRecord {
  id: number;
  student_id: number;
  subject_id: number;
  exam_id: number | null;
  marks_obtained: number;
  total_marks: number;
  percentage: number | null;
  remarks: string | null;
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
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [totalMarks, setTotalMarks] = useState("100");
  const [scores, setScores] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.default_exam_marks_scale && totalMarks === "100") {
      setTotalMarks(String(settings.default_exam_marks_scale));
    }
  }, [settings.default_exam_marks_scale]);

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
    
  useEffect(() => {
    if (exams.length > 0 && !exams.find(e => e.id === selectedExamId)) {
      setSelectedExamId(exams[0].id);
    } else if (exams.length === 0) {
      setSelectedExamId(null);
    }
  }, [exams, selectedExamId]);

  const existingMap = selectedSubjectId
    ? grades
        .filter(
          (g) => g.subject_id === selectedSubjectId && g.exam_id === selectedExamId
        )
        .reduce((acc, g) => {
          acc[g.student_id] = g;
          return acc;
        }, {} as Record<number, GradeRecord>)
    : {};

  const saveGrades = async () => {
    if (!selectedClassId || !selectedSubjectId || !teacher) return;
    if (!selectedExamId) {
      setMessage("Please select a specific exam to enter grades.");
      return;
    }

    const ms = Number(totalMarks);
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
            marks_obtained: entry.score,
            total_marks: ms,
            exam_id: selectedExamId,
          });
        } else {
          await api.post("/grades/", {
            student_id: entry.student_id,
            subject_id: selectedSubjectId,
            exam_id: selectedExamId,
            marks_obtained: entry.score,
            total_marks: ms,
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
            <label className="block text-sm font-medium text-gray-600 mb-1">Exam</label>
            <select
              value={selectedExamId ?? ""}
              onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={!selectedClassId || exams.length === 0}
            >
              {exams.length === 0 ? (
                <option value="" disabled>No exams found</option>
              ) : (
                <option value="" disabled>Select exam</option>
              )}
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Total Marks</label>
            <input
              type="number"
              min="1"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <button
              onClick={saveGrades}
              disabled={!selectedClassId || !selectedSubjectId || !selectedExamId || saving || classStudents.length === 0}
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
              — {subjects.find((s) => s.id === selectedSubjectId)?.name} {selectedExamId ? `· ${exams.find((e) => e.id === selectedExamId)?.title}` : ""}
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
                  const ms = Number(totalMarks);
                  return (
                    <tr key={s.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{s.full_name || `Student #${s.id}`}</div>
                        <div className="text-xs text-gray-500">Roll No: {s.roll_number || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={ms}
                          step="1"
                          value={scores[s.id] ?? (ex ? String(ex.marks_obtained) : "")}
                          onChange={(e) =>
                            setScores((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ms}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {ex ? `${ex.marks_obtained}/${ex.total_marks}` : "—"}
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
          {grades.length === 0 ? (
            <p className="text-gray-600">No recent grades.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades
                    .slice()
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10)
                    .map((g) => (
                      <tr key={g.id}>
                        <td className="px-4 py-2 text-gray-700">{students.find(s => s.id === g.student_id)?.full_name || `#${g.student_id}`}</td>
                        <td className="px-4 py-2 text-gray-700">{subjects.find((s) => s.id === g.subject_id)?.name || `#${g.subject_id}`}</td>
                        <td className="px-4 py-2 text-gray-700">{classes.find((c) => c.id === students.find(st => st.id === g.student_id)?.class_id)?.name || "—"}</td>
                        <td className="px-4 py-2 text-gray-700">{g.exam_id ? exams.find((e) => e.id === g.exam_id)?.title : "General"}</td>
                        <td className="px-4 py-2 text-gray-700 font-medium">{g.marks_obtained}/{g.total_marks}</td>
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
