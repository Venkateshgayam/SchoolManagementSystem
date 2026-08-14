"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Plus, Save, Search, FileText, Tag, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import PageLoader from "@/components/dashboard/PageLoader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { can } from "@/lib/permissions";

interface SubjectRecord {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  teacher_ids: number[];
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
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
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
    return <PageLoader label="Loading..." />;
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {s.teacher_ids && s.teacher_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.teacher_ids.map((tid) => (
                            <span key={tid} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
                              {teacherNames[tid] || `#${tid}`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-400">No teachers assigned</span>
                      )}
                    </td>
                    {(perm.update || perm.del) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {perm.update && (
                          <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-primary-600 mr-3" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {perm.update && (
                          <button onClick={() => { setAssignTarget(s); setSelectedTeachers(s.teacher_ids || []); setAssignOpen(true); }} className="text-gray-500 hover:text-teal-600 mr-3" title="Manage Teachers">
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

      <Modal open={assignOpen} title={assignTarget ? `Manage Teachers — ${assignTarget.name}` : "Manage Teachers"} onClose={() => { setAssignOpen(false); setSelectedTeachers([]); setAssignTarget(null); }}>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            <label className="label">Select Teachers</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-200 p-3 rounded-md">
              {teachers.map((t) => {
                const assignedSubject = subjects.find(s => s.teacher_ids?.includes(t.id) && s.id !== assignTarget?.id);
                return (
                  <label key={t.id} className={`flex items-center gap-2 text-sm ${assignedSubject ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(t.id)}
                      disabled={!!assignedSubject}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTeachers([...selectedTeachers, t.id]);
                        else setSelectedTeachers(selectedTeachers.filter(id => id !== t.id));
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span>
                      {t.full_name || `#${t.id}`}
                      {assignedSubject && <span className="ml-1 text-xs italic text-gray-400">(Assigned to {assignedSubject.name})</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setAssignOpen(false); setSelectedTeachers([]); setAssignTarget(null); }} className="btn-secondary">Cancel</button>
            <button onClick={async () => {
              if (!assignTarget) return;
              setAssigning(true);
              try {
                // Update the subject with the new list of teacher_ids
                await api.put(`/subjects/${assignTarget.id}`, { teacher_ids: selectedTeachers });
                toast.success("Teachers updated successfully");
                setAssignOpen(false);
                setSelectedTeachers([]);
                setAssignTarget(null);
                await fetchData();
              } catch (err: any) {
                toast.error(err?.response?.data?.detail || "Failed to update teachers");
              } finally { setAssigning(false); }
            }} className="btn-primary">{assigning ? "Saving…" : "Save Teachers"}</button>
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
