"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Plus, Save, Search, FileText, Tag, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { can } from "@/lib/permissions";

interface SubjectRecord {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  teacher_id: number | null;
}

interface FormState {
  name: string;
  code: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: "", code: "", description: "" };

export default function SubjectsManager() {
  const [perm, setPerm] = useState({ create: false, update: false, del: false });
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubjectRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [teachers, setTeachers] = useState<{ id: number; full_name?: string; user_id?: number }[]>([]);
  const [teacherNames, setTeacherNames] = useState<Record<number, string>>({});
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<SubjectRecord | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setPerm({ create: can("subject:create"), update: can("subject:update"), del: can("subject:delete") });
    api.get("/teachers/").then((res) => {
      setTeachers(res.data);
      // Build a lookup of teacher id -> name
      const names: Record<number, string> = {};
      for (const t of res.data) {
        names[t.id] = t.full_name || `Teacher #${t.id}`;
      }
      setTeacherNames(names);
    }).catch(() => setTeachers([]));
  }, []);

  const fetchData = async () => {
    const res = await api.get("/subjects/");
    setSubjects(res.data);
  };

  useEffect(() => {
    fetchData()
      .catch((err: any) => setError(err?.message || "Failed to load subjects"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q)
    );
  }, [subjects, search]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (subject: SubjectRecord) => {
    setEditing(subject);
    setForm({ name: subject.name, code: subject.code || "", description: subject.description || "" });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Subject name is required.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description || null,
      };
      if (editing) {
        await api.put(`/subjects/${editing.id}`, body);
        toast.success("Subject updated successfully.");
      } else {
        await api.post("/subjects/", body);
        toast.success("Subject created successfully.");
      }
      setOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || (editing ? "Failed to update subject." : "Failed to create subject."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/subjects/${deleteTarget.id}`);
      toast.success("Subject deleted successfully.");
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete subject.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading subjects…</div></div>;
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
        title="Subjects"
        subtitle="Manage school subjects"
        icon={BookOpen}
        action={
          perm.create ? (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Subject
            </button>
          ) : undefined
        }
      />

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{search ? "No subjects match your search." : "No subjects found."}</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  {(perm.update || perm.del) && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Tag className="h-4 w-4 inline mr-1 text-gray-400" />{s.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.code || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><FileText className="h-4 w-4 inline mr-1 text-gray-400" />{s.description || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.teacher_id ? (teacherNames[s.teacher_id] || `#${s.teacher_id}`) : "—"}</td>
                    {(perm.update || perm.del) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {perm.update && (
                          <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-primary-600 mr-3" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {perm.update && (
                          <button onClick={() => { setAssignTarget(s); setAssignOpen(true); }} className="text-gray-500 hover:text-teal-600 mr-3" title="Assign Teacher">
                            <Tag className="h-4 w-4" />
                          </button>
                        )}
                        {perm.del && (
                          <button onClick={() => setDeleteTarget(s)} className="text-gray-500 hover:text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{subjects.length} subject(s)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Subject" : "New Subject"} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" className="input-field" />
          </div>
          <div>
            <label className="label">Code</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH-101" className="input-field" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Subject details..." className="input-field" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={assignOpen} title={assignTarget ? `Assign Teacher — ${assignTarget.name}` : "Assign Teacher"} onClose={() => { setAssignOpen(false); setSelectedTeacher(null); setAssignTarget(null); }}>
        <div className="space-y-4">
          <div>
            <label className="label">Teacher</label>
            <select value={selectedTeacher ?? ""} onChange={(e) => setSelectedTeacher(e.target.value ? Number(e.target.value) : null)} className="input w-full">
              <option value="">Select teacher</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || `#${t.id}`}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setAssignOpen(false); setSelectedTeacher(null); setAssignTarget(null); }} className="btn-secondary">Cancel</button>
            <button onClick={async () => {
              if (!assignTarget) return;
              if (!selectedTeacher) { toast.error("Select a teacher"); return; }
              setAssigning(true);
              try {
                await api.post(`/subjects/${assignTarget.id}/assign-teacher?teacher_id=${selectedTeacher}`);
                toast.success("Teacher assigned to subject (updated schedules)");
                setAssignOpen(false);
                setSelectedTeacher(null);
                setAssignTarget(null);
              } catch (err: any) {
                toast.error(err?.response?.data?.detail || "Failed to assign teacher");
              } finally { setAssigning(false); }
            }} className="btn-primary">{assigning ? "Assigning…" : "Assign"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Subject"
        message={`Delete "${deleteTarget?.name}"? Related grades and assignments will be affected. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
