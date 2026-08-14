"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Save, BookOpen, Calendar, UserCheck, Pencil, Trash2 } from "lucide-react";
import {   formatTeacherNameId , formatDate } from "@/lib/formatters";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";
import { useSettings } from "@/hooks/useSettings";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { settings } = useSettings();
  const isPast = (dateStr: string | null) => dateStr ? new Date(dateStr) < new Date() : false;

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
        const [a, c, s, t] = await Promise.all([
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
          api.get("/teachers/").catch(() => ({ data: [] })),
        ]);
        setAssignments(a.data);
        setClasses(c.data);
        setSubjects(s.data);
        setTeachers(t.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

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
      setDeleteTarget(null);
      await fetchAssignments();
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
                  <tr key={a.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{subjectName(a.subject_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{className(a.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{a.due_date ? formatDate(a.due_date) : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><UserCheck className="h-4 w-4 inline mr-1 text-gray-400" />{a.teacher_id ? formatTeacherNameId(teachers.find(t => t.id === a.teacher_id)?.full_name, a.teacher_id) : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => !isPast(a.due_date) && openEdit(a)}
                        className={`text-gray-500 hover:text-primary-600 mr-3 ${isPast(a.due_date) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPast(a.due_date) ? "Cannot edit — due date has passed" : "Edit"}
                        disabled={isPast(a.due_date)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(a)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
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
                onChange={(e) => setFormSubjectId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No subject</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No teacher</option>
                {(formSubjectId 
                  ? teachers.filter(t => subjects.find(s => s.id === formSubjectId)?.teacher_ids?.includes(t.id)) 
                  : teachers
                ).map((t) => (
                  <option key={t.id} value={t.id}>{formatTeacherNameId(t.full_name, t.id)}</option>
                ))}
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
        message={`Are you sure you want to delete ${deleteTarget?.title}? This action cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}