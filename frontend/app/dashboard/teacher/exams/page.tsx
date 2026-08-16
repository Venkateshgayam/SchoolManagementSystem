"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import React from "react";
import { BookOpen, Users, Save, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp, Paperclip, Award, FileText, Plus, Tag, Pencil, X } from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { calculateLiveGrade } from "@/lib/gradeUtils";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";

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
  teacher_ids: number[];
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
  class_id: number | null;
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
  const [grades, setGrades] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null); // slot ID
  const [gradeInputs, setGradeInputs] = useState<Record<number, string>>({});
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formClassId, setFormClassId] = useState<number | "">("");
  const [formAcademicYear, setFormAcademicYear] = useState("");
  const [formTotalMarks, setFormTotalMarks] = useState("");
  const [formSlots, setFormSlots] = useState<Partial<ExamSubjectSlot>[]>([]);

  const fetchExams = async () => {
    const examsRes = await api.get("/exams/");
    setExams(examsRes.data);
  };

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, subjectsRes, examsRes, studentsRes, submissionsRes, gradesRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          // Fetch ALL subjects (admin endpoint returns all) for name resolution.
          // The backend already filters /exams/ to only this teacher's exams.
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/exams/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/exam-submissions/").catch(() => ({ data: [] })),
          api.get("/grades/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
        setExams(examsRes.data);
        setStudents(studentsRes.data);
        setSubmissions(submissionsRes.data);
        setGrades(gradesRes.data);
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

  const isPast = (slots: ExamSubjectSlot[]) => slots.length > 0 && slots.some(s => new Date(s.start_time) < new Date());

  const resetForm = () => {
    setFormName("");
    setFormClassId("");
    setFormAcademicYear("");
    setFormTotalMarks("");
    setFormSlots([]);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (e: ExamInfo) => {
    setEditing(e);
    setFormName(e.name);
    setFormClassId(e.class_id || "");
    setFormAcademicYear(e.academic_year || "");
    setFormTotalMarks(e.total_marks ? String(e.total_marks) : "");
    setFormSlots(e.slots.map(s => {
      const dDate = new Date(s.date);
      const dStart = new Date(s.start_time);
      const dEnd = new Date(s.end_time);
      return {
        id: s.id,
        subject_id: s.subject_id,
        date: dDate.toLocaleDateString('en-CA'),
        start_time: dStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        end_time: dEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    }));
    setOpen(true);
  };

  const handleAddSlot = () => {
    setFormSlots([...formSlots, { subject_id: 0, date: "", start_time: "", end_time: "" }]);
  };

  const handleRemoveSlot = (index: number) => {
    setFormSlots(formSlots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof ExamSubjectSlot, value: any) => {
    const updated = [...formSlots];
    updated[index] = { ...updated[index], [field]: value };
    setFormSlots(updated);
  };

  const handleSubmit = async () => {
    if (!formName || formClassId === "") {
      toast.error("Exam name and class are required.");
      return;
    }
    
    for (const slot of formSlots) {
      if (!slot.subject_id || !slot.date || !slot.start_time || !slot.end_time) {
        toast.error("Please fill all fields for all subject slots.");
        return;
      }
    }

    setSaving(true);
    try {
      const slotsPayload = formSlots.map(s => {
        const start = new Date(`${s.date}T${s.start_time}:00`);
        const end = new Date(`${s.date}T${s.end_time}:00`);
        const dateOnly = new Date(`${s.date}T00:00:00`);
        
        return {
          subject_id: Number(s.subject_id),
          date: dateOnly.toISOString(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        };
      });

      const payload = {
        name: formName,
        class_id: formClassId,
        academic_year: formAcademicYear || null,
        total_marks: formTotalMarks ? Number(formTotalMarks) : null,
        slots: slotsPayload
      };

      if (editing) {
        await api.put(`/exams/${editing.id}`, payload);
      } else {
        await api.post("/exams/", payload);
      }
      setOpen(false);
      resetForm();
      await fetchExams();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/exams/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchExams();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete exam");
    } finally {
      setDeleting(false);
    }
  };

  const handleGrade = async (submissionId: number) => {
    const val = gradeInputs[submissionId];
    if (!val || isNaN(Number(val))) return;
    setGradingId(submissionId);
    try {
      const res = await api.put(`/exam-submissions/${submissionId}/grade`, { grade: Number(gradeInputs[submissionId]) });
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? res.data : s)));
      // Refresh grades
      const gradesRes = await api.get("/grades/");
      setGrades(gradesRes.data);
      toast.success("Marks saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save marks");
    } finally {
      setGradingId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading exams...</div></div>;
  if (error) return <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>;
  if (!teacher) return <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600">Teacher profile not available.</p></div>;

  // The backend /exams/ endpoint already filters to only the exams whose slots
  // cover subjects this teacher is assigned to (via teacher_subjects M2M).
  // Do NOT re-filter by teacherSubjects here — that would use the Schedule-based
  // /subjects/ endpoint which may return an empty list if no schedules exist.
  const mySlots = exams.flatMap(exam =>
    (exam.slots || []).map(slot => ({ ...slot, exam }))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exam Submissions</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Exam
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Award className="h-5 w-5" /> Managed Exams
          </h2>
        </div>
        {exams.length === 0 ? (
          <p className="text-gray-500 text-sm">No managed exams found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Tag className="h-4 w-4 inline mr-1 text-gray-400" />{e.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {e.slots.length} Subjects
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Award className="h-4 w-4 inline mr-1 text-gray-400" />{e.academic_year || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => !isPast(e.slots) && openEdit(e)}
                        className={`text-gray-500 hover:text-primary-600 mr-3 ${isPast(e.slots) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPast(e.slots) ? "Cannot edit — exam date has passed or started" : "Edit"}
                        disabled={isPast(e.slots)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(e)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                                {(() => {
                                  const classStudents = students.filter((s) => !slot.exam.class_id || s.class_id === slot.exam.class_id);
                                  const slotSubmissions = submissions.filter((sub) => sub.exam_subject_slot_id === slot.id);
                                  
                                  if (classStudents.length === 0 && slotSubmissions.length === 0) {
                                    return <li className="p-4 text-sm text-gray-500 text-center">No students or submissions found for this exam slot.</li>;
                                  }

                                  const renderedStudentIds = new Set<number>();
                                  const items: { student: StudentInfo; submission: SubmissionRecord | undefined; gradeRecord: any }[] = [];

                                  for (const student of classStudents) {
                                    renderedStudentIds.add(student.id);
                                    const submission = slotSubmissions.find((sub) => sub.student_id === student.id);
                                    const gradeRecord = grades.find((g) => g.exam_id === slot.exam.id && g.subject_id === slot.subject_id && g.student_id === student.id);
                                    items.push({ student, submission, gradeRecord });
                                  }

                                  for (const submission of slotSubmissions) {
                                    if (!renderedStudentIds.has(submission.student_id)) {
                                      const student = students.find((s) => s.id === submission.student_id) || {
                                        id: submission.student_id,
                                        user_id: 0,
                                        full_name: `Student #${submission.student_id}`,
                                        roll_number: null,
                                        class_id: null,
                                      };
                                      const gradeRecord = grades.find((g) => g.exam_id === slot.exam.id && g.subject_id === slot.subject_id && g.student_id === submission.student_id);
                                      items.push({ student, submission, gradeRecord });
                                    }
                                  }

                                  return items.map(({ student, submission, gradeRecord }) => (
                                    <li key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 mb-1">
                                          {student.full_name || `Student #${student.id}`} {student.roll_number ? `(${student.roll_number})` : ""}
                                        </p>
                                        {submission ? (
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
                                        ) : (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            Not submitted
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-right flex flex-col items-end">
                                        {submission && (
                                          <>
                                            <span className="text-xs text-gray-500 block mb-2">
                                              {new Date(submission.submitted_at).toLocaleString()}
                                            </span>
                                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-md border border-gray-200">
                                              <span className="text-sm font-medium text-gray-700 ml-1">Marks:</span>
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
                                              {(() => {
                                                const inputVal = gradeInputs[submission.id] !== undefined ? gradeInputs[submission.id] : (submission.grade ?? "");
                                                const maxMarks = slot.exam.total_marks || settings.default_exam_marks_scale || 100;
                                                const liveGrade = calculateLiveGrade(inputVal, maxMarks, settings.grading_scale) || gradeRecord?.letter_grade;
                                                return liveGrade ? (
                                                  <span className="ml-2 font-bold text-lg text-primary-700">
                                                    Grade: {liveGrade}
                                                  </span>
                                                ) : null;
                                              })()}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </li>
                                  ));
                                })()}
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

      <Modal open={open} title={editing ? "Edit Exam" : "New Exam"} onClose={() => setOpen(false)}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Final Examination"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
            <select
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section || ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Academic Year</label>
              <input
                type="text"
                value={formAcademicYear}
                onChange={(e) => setFormAcademicYear(e.target.value)}
                placeholder="e.g. 2025-2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total Marks</label>
              <input
                type="number"
                value={formTotalMarks}
                onChange={(e) => setFormTotalMarks(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Subject Slots</h4>
              <button onClick={handleAddSlot} className="text-primary-600 hover:text-primary-800 text-sm flex items-center gap-1 font-medium">
                <PlusCircle className="h-4 w-4" /> Add Subject
              </button>
            </div>
            
            {formSlots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No subjects added to this exam yet.
              </p>
            ) : (
              <div className="space-y-3">
                {formSlots.map((slot, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="w-full sm:w-1/3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                      <select
                        value={slot.subject_id || ""}
                        onChange={(e) => updateSlot(index, "subject_id", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="">Select subject</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-1/4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={slot.date || ""}
                        onChange={(e) => updateSlot(index, "date", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div className="w-full sm:w-1/5">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                      <input
                        type="time"
                        value={slot.start_time || ""}
                        onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div className="w-full sm:w-1/5">
                      <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                      <input
                        type="time"
                        value={slot.end_time || ""}
                        onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveSlot(index)}
                      className="text-gray-400 hover:text-red-500 p-1.5"
                      title="Remove Slot"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-6 border-t border-gray-100">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : (editing ? "Update" : "Create")}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Exam"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This will also remove any student submissions associated with it. This action cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
