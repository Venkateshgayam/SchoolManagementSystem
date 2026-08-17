"use client";

import React, { useState, useEffect } from "react";
import { FileText, Plus, Save, BookOpen, Calendar, UserCheck, Pencil, Trash2, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import {   formatTeacherNameId , formatDate } from "@/lib/formatters";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";
import { useSettings } from "@/hooks/useSettings";
import { calculateLiveGrade } from "@/lib/gradeUtils";

interface AssignmentRecord {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  class_id: number | null;
  teacher_id: number | null;
  due_date: string | null;
  total_marks: number | null;
  attachment_url: string | null;
}
interface ClassRecord {
  id: number;
  name: string;
  section: string | null;
}
interface SubjectRecord {
  id: number;
  name: string;
  code: string | null;
  teacher_ids?: number[];
}
interface TeacherRecord {
  id: number;
  user_id: number;
  full_name?: string | null;
}

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { settings } = useSettings();
  const isPast = (dateStr: string | null) => dateStr ? new Date(dateStr) < new Date() : false;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<number, string>>({});
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubjectId, setFormSubjectId] = useState<number | "">("");
  const [formClassId, setFormClassId] = useState<number | "">("");
  const [formTeacherId, setFormTeacherId] = useState<number | "">("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formTotalMarks, setFormTotalMarks] = useState<number | "">("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");

  const fetchAssignments = async () => {
    const res = await api.get("/assignments/");
    setAssignments(res.data);
  };

  useEffect(() => {
    async function fetchAll() {
      try {
        const [a, c, s, t, st, sub, gr] = await Promise.all([
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/teachers/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/assignment-submissions/").catch(() => ({ data: [] })),
          api.get("/grades/").catch(() => ({ data: [] })),
        ]);
        setAssignments(a.data);
        setClasses(c.data);
        setSubjects(s.data);
        setTeachers(t.data);
        setStudents(st.data);
        setSubmissions(sub.data);
        setGrades(gr.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleGrade = async (submissionId: number) => {
    const val = gradeInputs[submissionId];
    if (!val || isNaN(Number(val))) return;
    setGradingId(submissionId);
    try {
      const res = await api.put(`/assignment-submissions/${submissionId}/grade`, { grade: Number(val) });
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? res.data : s)));
      const gradesRes = await api.get("/grades/");
      setGrades(gradesRes.data);
      toast.success("Marks saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save marks");
    } finally {
      setGradingId(null);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormSubjectId("");
    setFormClassId("");
    setFormTeacherId("");
    setFormDueDate("");
    setFormTotalMarks(settings.default_assignment_marks_scale || 30);
    setFormAttachmentUrl("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (a: AssignmentRecord) => {
    setEditing(a);
    setFormTitle(a.title);
    setFormDescription(a.description || "");
    setFormSubjectId(a.subject_id ?? "");
    setFormClassId(a.class_id ?? "");
    setFormTeacherId(a.teacher_id ?? "");
    setFormDueDate(a.due_date ? new Date(a.due_date).toLocaleDateString('en-CA') : "");
    setFormTotalMarks(a.total_marks || 30);
    setFormAttachmentUrl(a.attachment_url || "");
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitle) {
      toast.error("Assignment title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: formTitle,
        description: formDescription || null,
        subject_id: formSubjectId === "" ? null : formSubjectId,
        class_id: formClassId === "" ? null : formClassId,
        teacher_id: formTeacherId === "" ? null : formTeacherId,
        due_date: formDueDate ? new Date(`${formDueDate}T23:59:59`).toISOString() : null,
        total_marks: formTotalMarks === "" ? null : Number(formTotalMarks),
        attachment_url: formAttachmentUrl || null,
      };

      if (editing) {
        await api.put(`/assignments/${editing.id}`, payload);
      } else {
        await api.post("/assignments/", payload);
      }
      setOpen(false);
      resetForm();
      await fetchAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/assignments/${deleteTarget.id}`);
      toast.success("Assignment deleted successfully");
      setDeleteTarget(null);
      await fetchAssignments();
      const [subRes, grRes] = await Promise.all([
        api.get("/assignment-submissions/").catch(() => ({ data: [] })),
        api.get("/grades/").catch(() => ({ data: [] })),
      ]);
      setSubmissions(subRes.data);
      setGrades(grRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete assignment");
    } finally {
      setDeleting(false);
    }
  };

  const className = (id: number | null) => {
    const c = classes.find((cl) => cl.id === id);
    return c ? `${c.name} ${c.section || ""}`.trim() : id === null ? "—" : `#${id}`;
  };
  const subjectName = (id: number | null) => {
    const s = subjects.find((sub) => sub.id === id);
    return s ? `${s.code ? `${s.code} - ` : ""}${s.name}` : id === null ? "—" : `#${id}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading assignments…</div></div>;
  }
  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Manage homework and assignments"
        icon={FileText}
        action={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Assignment
          </button>
        }
      />

      {assignments.length === 0 ? (
        <div className="card text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No assignments found.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.slice().sort((a, b) => (b.due_date || "").localeCompare(a.due_date || "")).map((a) => (
                    <React.Fragment key={a.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{subjectName(a.subject_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{className(a.class_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{a.due_date ? formatDate(a.due_date) : "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><UserCheck className="h-4 w-4 inline mr-1 text-gray-400" />{a.teacher_id ? formatTeacherNameId(teachers.find(t => t.id === a.teacher_id)?.full_name, a.teacher_id) : "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm flex justify-end items-center gap-3">
                          <button
                            onClick={() => !isPast(a.due_date) && openEdit(a)}
                            className={`text-gray-500 hover:text-primary-600 ${isPast(a.due_date) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isPast(a.due_date) ? "Cannot edit — due date has passed" : "Edit"}
                            disabled={isPast(a.due_date)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(a)} className="text-gray-500 hover:text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleExpand(a.id)}
                            className="text-primary-600 hover:text-primary-900 flex items-center justify-end w-28 ml-2"
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
                                    const gradeRecord = grades.find(
                                      (g) => g.assignment_id === a.id && g.student_id === student.id
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
                                                <span className="text-sm font-medium text-gray-700 ml-1">Marks:</span>
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
                                                {(() => {
                                                  const inputVal = gradeInputs[submission.id] !== undefined ? gradeInputs[submission.id] : (submission.grade ?? "");
                                                  const maxMarks = a.total_marks || settings.default_assignment_marks_scale || 30;
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
          <p className="mt-4 text-sm text-gray-600">{assignments.length} assignment(s)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Assignment" : "New Assignment"} onClose={() => setOpen(false)} maxWidth="max-w-xl">
        <div className="space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
              <select
                value={formSubjectId}
                onChange={(e) => {
                  const newSubId = e.target.value ? Number(e.target.value) : "";
                  setFormSubjectId(newSubId);
                  if (!newSubId) {
                    setFormTeacherId("");
                  } else if (formTeacherId !== "") {
                    const newSub = subjects.find((s) => s.id === newSubId);
                    if (!newSub?.teacher_ids?.includes(Number(formTeacherId))) {
                      setFormTeacherId("");
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.code ? `${s.code} - ${s.name}` : s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.section || ""}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Teacher</label>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
                disabled={!formSubjectId}
              >
                {!formSubjectId ? (
                  <option value="">Select a subject first</option>
                ) : (
                  (() => {
                    const selectedSub = subjects.find((s) => s.id === formSubjectId);
                    const validTeachers = teachers.filter((t) => selectedSub?.teacher_ids?.includes(t.id));
                    if (validTeachers.length === 0) {
                      return <option value="">No teachers assigned to this subject</option>;
                    }
                    return (
                      <>
                        <option value="">Select teacher (optional)</option>
                        {validTeachers.map((t) => (
                          <option key={t.id} value={t.id}>{formatTeacherNameId(t.full_name, t.id)}</option>
                        ))}
                      </>
                    );
                  })()
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Attachment URL</label>
            <input
              type="url"
              value={formAttachmentUrl}
              onChange={(e) => setFormAttachmentUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              placeholder="Assignment details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : (editing ? "Update" : "Create")}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assignment"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently delete the assignment along with all student submissions, attachments, and associated grades. This action cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}