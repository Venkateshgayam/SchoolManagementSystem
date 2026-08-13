"use client";

import { formatDate } from "@/lib/formatters";
import React, { useState, useEffect } from "react";
import { BookOpen, Users, Save, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp, Paperclip, Pencil } from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";
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
  assignment_id: number;
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
}

interface AssignmentInfo {
  id: number;
  title: string;
  description: string | null;
  class_id: number;
  subject_id: number;
  teacher_id: number | null;
  due_date: string | null;
  total_marks: number | null;
  created_at: string;
  updated_at: string | null;
}

export default function TeacherAssignmentsPage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<number, string>>({});
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { settings } = useSettings();
  
  const isPast = (dateStr: string | null) => dateStr ? new Date(dateStr) < new Date() : false;

  // Edit/Delete state
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<AssignmentInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formClassId, setFormClassId] = useState<number | "">("");
  const [formSubjectId, setFormSubjectId] = useState<number | "">("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formTotalMarks, setFormTotalMarks] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [teacherRes, classesRes, subjectsRes, assignmentsRes, studentsRes, submissionsRes] = await Promise.all([
        api.get("/teachers/me").catch(() => ({ data: null })),
        api.get("/classes/").catch(() => ({ data: [] })),
        api.get("/subjects/").catch(() => ({ data: [] })),
        api.get("/assignments/").catch(() => ({ data: [] })),
        api.get("/students/").catch(() => ({ data: [] })),
        api.get("/assignment-submissions").catch(() => ({ data: [] })),
      ]);

      setTeacher(teacherRes.data);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      setAssignments(assignmentsRes.data);
      setStudents(studentsRes.data);
      setSubmissions(submissionsRes.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const teacherClasses = classes.filter((c) => c.teacher_id === teacher?.id);
  const myAssignments = assignments.filter((a) =>
    teacherClasses.some((c) => c.id === a.class_id)
  );

  const toggleExpand = (assignmentId: number) => {
    setExpandedId(expandedId === assignmentId ? null : assignmentId);
  };

  const handleGrade = async (submissionId: number) => {
    const val = gradeInputs[submissionId];
    if (!val || isNaN(Number(val))) return;
    setGradingId(submissionId);
    try {
      await api.put(`/assignment-submissions/${submissionId}/grade`, { grade: Number(val) });
      const res = await api.get("/assignment-submissions");
      setSubmissions(res.data);
      setGradeInputs((prev) => ({ ...prev, [submissionId]: "" }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update marks");
    } finally {
      setGradingId(null);
    }
  };

  const resetForm = () => {
    setFormClassId("");
    setFormSubjectId("");
    setFormTitle("");
    setFormDesc("");
    setFormDueDate("");
    setFormTotalMarks(settings.default_assignment_marks_scale || 30);
    setEditing(null);
    setMessage(null);
  };

  const openEditModal = (a: AssignmentInfo) => {
    setEditing(a);
    setFormClassId(a.class_id);
    setFormSubjectId(a.subject_id);
    setFormTitle(a.title);
    setFormDesc(a.description || "");
    setFormDueDate(a.due_date ? new Date(a.due_date).toLocaleDateString('en-CA') : "");
    setFormTotalMarks(a.total_marks || settings.default_assignment_marks_scale || 30);
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!teacher || formClassId === "" || formSubjectId === "" || !formTitle) {
      setMessage("Please fill class, subject, and title.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title: formTitle,
        description: formDesc || null,
        class_id: formClassId,
        subject_id: formSubjectId,
        teacher_id: teacher.id,
        due_date: formDueDate ? new Date(`${formDueDate}T23:59:59`).toISOString() : null,
        total_marks: formTotalMarks === "" ? null : Number(formTotalMarks),
      };

      if (editing) {
        await api.put(`/assignments/${editing.id}`, payload);
        setMessage("Assignment updated.");
      } else {
        await api.post("/assignments/", payload);
        setMessage("Assignment created.");
      }
      setOpenModal(false);
      resetForm();
      const res = await api.get("/assignments/");
      setAssignments(res.data);
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/assignments/${deleteTarget.id}`);
      setDeleteTarget(null);
      const res = await api.get("/assignments/");
      setAssignments(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete assignment");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading assignments...</div>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <button onClick={() => { resetForm(); setOpenModal(true); }} className="btn-primary flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> New Assignment
        </button>
      </div>

      {message && (
        <div
          className={`card mb-6 ${
            message.includes("Failed") || message.includes("Please")
              ? "border-danger-200 bg-danger-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-sm ${
              message.includes("Failed") || message.includes("Please")
                ? "text-danger-600"
                : "text-green-800"
            }`}
          >
            {message}
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> My Assignments
        </h2>
        {myAssignments.length === 0 ? (
          <div className="text-center py-8">
            <PlusCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No assignments found for your classes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myAssignments
                  .slice()
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((a) => (
                    <React.Fragment key={a.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {classes.find((c) => c.id === a.class_id)
                            ? `${classes.find((c) => c.id === a.class_id)!.name} ${
                                classes.find((c) => c.id === a.class_id)!.section || ""
                              }`.trim()
                            : `#${a.class_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {subjects.find((s) => s.id === a.subject_id)?.name || `#${a.subject_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {a.due_date ? formatDate(a.due_date) : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(a.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center gap-4">
                          <button
                            onClick={() => !isPast(a.due_date) && openEditModal(a)}
                            className={`text-gray-500 hover:text-primary-600 ${isPast(a.due_date) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isPast(a.due_date) ? "Cannot edit — due date has passed" : "Edit Assignment"}
                            disabled={isPast(a.due_date)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="text-gray-500 hover:text-red-600"
                            title="Delete Assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleExpand(a.id)}
                            className="text-primary-600 hover:text-primary-900 flex items-center justify-end w-32"
                          >
                            {expandedId === a.id ? (
                              <><ChevronUp className="h-4 w-4 mr-1" /> Hide Subs</>
                            ) : (
                              <><ChevronDown className="h-4 w-4 mr-1" /> View Subs</>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedId === a.id && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-800">Student Submissions</h4>
                              </div>
                              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                {students
                                  .filter((s) => s.class_id === a.class_id)
                                  .map((student) => {
                                    const submission = submissions.find(
                                      (sub) => sub.assignment_id === a.id && sub.student_id === student.id
                                    );
                                    return (
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
                                                <input
                                                  type="number"
                                                  step="1"
                                                  min="0"
                                                  max={a.total_marks || 30}
                                                  value={gradeInputs[submission.id] !== undefined ? gradeInputs[submission.id] : (submission.grade ?? "")}
                                                  onChange={(e) => setGradeInputs({ ...gradeInputs, [submission.id]: e.target.value })}
                                                  placeholder={`/ ${a.total_marks || 30}`}
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
                                            </>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                {students.filter((s) => s.class_id === a.class_id).length === 0 && (
                                  <li className="p-4 text-sm text-gray-500 text-center">No students in this class.</li>
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

      <Modal open={openModal} title={editing ? "Edit Assignment" : "New Assignment"} onClose={() => setOpenModal(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select class</option>
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
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} - ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Chapter 3 Homework"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total Marks</label>
              <input
                type="number"
                min="1"
                value={formTotalMarks}
                onChange={(e) => setFormTotalMarks(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              placeholder="Assignment details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpenModal(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSave}
              disabled={formClassId === "" || formSubjectId === "" || !formTitle || saving}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : (editing ? "Update" : "Create")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!previewUrl} title="Attachment Preview" onClose={() => setPreviewUrl(null)} maxWidth="max-w-4xl">
        {previewUrl && (
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
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assignment"
        message={`Are you sure you want to delete ${deleteTarget?.title}? This will also delete all student submissions for it. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
