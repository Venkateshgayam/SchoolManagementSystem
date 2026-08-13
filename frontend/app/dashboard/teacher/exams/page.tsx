"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import React from "react";
import { BookOpen, Users, Save, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp, Paperclip, Award, FileText } from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";

interface TeacherInfo {
  id: number;
  user_id: number;
}

interface StudentInfo {
  id: number;
  user_id: number;
  full_name?: string;
  roll_number?: string | null;
  class_id: number | null;
}

interface SubmissionRecord {
  id: number;
  exam_subject_slot_id: number;
  student_id: number;
  submission_text: string | null;
  attachment_url: string | null;
  submitted_at: string;
  grade: number | null;
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
  teacher_id: number | null;
}

interface ExamSubjectSlot {
  id: number;
  subject_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface ExamInfo {
  id: number;
  name: string;
  exam_type: string | null;
  academic_year: string | null;
  total_marks: number | null;
  slots: ExamSubjectSlot[];
}

export default function TeacherExamsPage() {
  const { settings } = useSettings();
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null); // slot ID
  const [gradeInputs, setGradeInputs] = useState<Record<number, string>>({});
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, subjectsRes, examsRes, studentsRes, submissionsRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/exam-submissions/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
        setExams(examsRes.data);
        setStudents(studentsRes.data);
        setSubmissions(submissionsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load exams");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || `Subject ${id}`;

  const toggleExpand = (slotId: number) => {
    setExpandedId(expandedId === slotId ? null : slotId);
  };

  const handleGrade = async (submissionId: number) => {
    const val = gradeInputs[submissionId];
    if (!val || isNaN(Number(val))) return;
    setGradingId(submissionId);
    try {
      await api.put(`/exam-submissions/${submissionId}/grade`, { grade: Number(val) });
      const res = await api.get("/exam-submissions/");
      setSubmissions(res.data);
      setGradeInputs((prev) => ({ ...prev, [submissionId]: "" }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update grade");
    } finally {
      setGradingId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading exams...</div></div>;
  if (error) return <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>;
  if (!teacher) return <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600">Teacher profile not available.</p></div>;

  const teacherSubjects = subjects.filter(s => s.teacher_id === teacher.id).map(s => s.id);
  
  // Flatten slots and include parent exam info, filter by subjects taught by the teacher
  const mySlots = exams.flatMap(exam => 
    (exam.slots || []).map(slot => ({ ...slot, exam }))
  ).filter(slot => teacherSubjects.includes(slot.subject_id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Exam Submissions</h1>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" /> My Exam Subjects
        </h2>
        {mySlots.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No exam slots found for the subjects you teach.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mySlots
                  .map((slot) => (
                    <React.Fragment key={slot.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.exam.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getSubjectName(slot.subject_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(slot.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => toggleExpand(slot.id)}
                            className="text-primary-600 hover:text-primary-900 flex items-center justify-end w-full"
                          >
                            {expandedId === slot.id ? (
                              <><ChevronUp className="h-4 w-4 mr-1" /> Hide Submissions</>
                            ) : (
                              <><ChevronDown className="h-4 w-4 mr-1" /> View Submissions</>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedId === slot.id && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-800">Student Submissions</h4>
                              </div>
                              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                {students.map((student) => {
                                    const submission = submissions.find(
                                      (sub) => sub.exam_subject_slot_id === slot.id && sub.student_id === student.id
                                    );
                                    
                                    if (!submission) return null; // Only show students who have submitted something or all? Let's show all for now since exam applies to everyone. Actually no, let's just show who submitted.

                                    return (
                                      <li key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900 mb-1">
                                            {student.full_name || `Student #${student.id}`} {student.roll_number ? `(${student.roll_number})` : ""}
                                          </p>
                                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-3 border border-gray-100">
                                            {submission.submission_text ? (
                                              <p className="whitespace-pre-wrap">{submission.submission_text}</p>
                                            ) : (
                                              <p className="italic text-gray-400">No text provided.</p>
                                            )}
                                            {submission.attachment_url && (
                                              <div className="mt-3 pt-3 border-t border-gray-200">
                                                {submission.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                  <div className="mt-2">
                                                    <img 
                                                      src={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${submission.attachment_url}`} 
                                                      alt="Attachment Preview" 
                                                      className="max-w-sm max-h-64 object-contain rounded-md border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                      onClick={() => setPreviewUrl(`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${submission.attachment_url}`)}
                                                      title="Click to enlarge"
                                                    />
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => setPreviewUrl(`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${submission.attachment_url}`)}
                                                    className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-medium bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors"
                                                  >
                                                    <Paperclip className="h-4 w-4" /> View Attachment
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                          <span className="text-xs text-gray-500 block mb-2">
                                            {new Date(submission.submitted_at).toLocaleString()}
                                          </span>
                                          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-md border border-gray-200">
                                            <input
                                              type="number"
                                              step="1"
                                              min="0"
                                              max={slot.exam.total_marks || settings.default_exam_marks_scale || 100}
                                              value={gradeInputs[submission.id] !== undefined ? gradeInputs[submission.id] : (submission.grade ?? "")}
                                              onChange={(e) => setGradeInputs({ ...gradeInputs, [submission.id]: e.target.value })}
                                              placeholder={`/ ${slot.exam.total_marks || settings.default_exam_marks_scale || 100}`}
                                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                            <button
                                              onClick={() => handleGrade(submission.id)}
                                              disabled={gradingId === submission.id || !gradeInputs[submission.id]}
                                              className="px-3 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                            >
                                              {gradingId === submission.id ? "..." : "Save"}
                                            </button>
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                {students.filter(student => submissions.some(sub => sub.exam_subject_slot_id === slot.id && sub.student_id === student.id)).length === 0 && (
                                  <li className="p-4 text-sm text-gray-500 text-center">No submissions yet for this slot.</li>
                                )}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-gray-600 bg-opacity-50">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-lg border border-gray-100 mt-8 mb-8 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Attachment Preview</h3>
              <button onClick={() => setPreviewUrl(null)} className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-center items-center h-[70vh] bg-gray-100 rounded-lg overflow-hidden relative">
                {previewUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={previewUrl} alt="Attachment" className="max-w-full max-h-full object-contain" />
                ) : (
                  <iframe src={previewUrl} className="w-full h-full border-0" />
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary py-1 px-3 text-sm shadow-md"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
