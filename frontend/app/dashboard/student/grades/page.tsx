"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { getLetterGrade, getGradeColor } from "@/lib/gradeUtils";
import OverallResult, { OverallResultData } from "@/components/dashboard/OverallResult";

interface GradeRecord {
  id: number;
  student_id: number;
  subject_id: number;
  exam_id: number | null;
  marks_obtained: number;
  total_marks: number;
  percentage: number | null;
}

interface SubjectInfo {
  id: number;
  name: string;
}

interface ExamInfo {
  id: number;
  title: string;
}

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [overallResult, setOverallResult] = useState<OverallResultData | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    async function fetchGrades() {
      try {
        const [gradesRes, studentRes, subjectsRes, examsRes] = await Promise.all([
          api.get("/grades/").catch(() => ({ data: [] })),
          api.get("/students/me").catch(() => ({ data: null })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] }))
        ]);

        const student = studentRes.data;
        const studentGrades = gradesRes.data.filter((g: GradeRecord) => g.student_id === student?.id);
        setGrades(studentGrades);
        setSubjects(subjectsRes.data);
        setExams(examsRes.data);
        
        const latestExamId = studentGrades.length > 0 
          ? Math.max(...studentGrades.map((g: any) => g.exam_id).filter(Boolean)) 
          : "";
        if (latestExamId !== -Infinity && latestExamId) {
          setSelectedExamId(latestExamId);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load grades");
      } finally {
        setLoading(false);
      }
    }

    fetchGrades();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      api.get(`/results/student/me?exam_id=${selectedExamId}`)
        .then(res => setOverallResult(res.data))
        .catch(() => setOverallResult(null));
    } else {
      setOverallResult(null);
    }
  }, [selectedExamId]);

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || `Subject ${subjectId}`;
  };

  const getExamName = (examId: number | null) => {
    if (!examId) return "N/A";
    const exam = exams.find((e) => e.id === examId);
    return exam?.title || `Exam ${examId}`;
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

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
        <select
          className="input-field w-full md:w-64 bg-white"
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- Select an Exam --</option>
          {exams.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.title}</option>
          ))}
        </select>
      </div>

      {selectedExamId ? (
        <OverallResult result={overallResult} />
      ) : (
        <div className="card mb-6 p-4">
          <p className="text-gray-500 text-sm italic">Select an exam to view the overall result.</p>
        </div>
      )}

      {grades.length === 0 ? (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No grades available yet.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.map((grade) => {
                  // * 100 here is a mathematical percentage-conversion constant, not a configurable value
                  const pct = grade.percentage || (grade.total_marks > 0 ? (grade.marks_obtained / grade.total_marks) * 100 : 0);
                  // Use configured grading_scale from settings; falls back to default scale in gradeUtils
                  const letterGrade = getLetterGrade(pct, settings.grading_scale);
                  return (
                    <tr key={grade.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getSubjectName(grade.subject_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getExamName(grade.exam_id)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grade.marks_obtained}/{grade.total_marks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pct.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(letterGrade)}`}>
                          {letterGrade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}