"use client";

import { useState, useEffect } from "react";
import { BookMarked, Plus, Save, Clock, Trash2 } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";

interface CurriculumRecord {
  id: number;
  subject_id: number;
  class_id: number;
  description: string | null;
  teaching_hours: number | null;
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
}

export default function AdminCurriculumPage() {
  const [curriculum, setCurriculum] = useState<CurriculumRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CurriculumRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formSubjectId, setFormSubjectId] = useState<number | "">("");
  const [formClassId, setFormClassId] = useState<number | "">("");
  const [formDescription, setFormDescription] = useState("");
  const [formTeachingHours, setFormTeachingHours] = useState("");

  const fetchCurriculum = async () => {
    const res = await api.get("/curriculum/");
    setCurriculum(res.data);
  };

  useEffect(() => {
    async function fetchAll() {
      try {
        const [c, cl, sub] = await Promise.all([
          api.get("/curriculum/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
        ]);
        setCurriculum(c.data);
        setClasses(cl.data);
        setSubjects(sub.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load curriculum");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const resetForm = () => {
    setFormSubjectId("");
    setFormClassId("");
    setFormDescription("");
    setFormTeachingHours("");
  };

  const handleCreate = async () => {
    if (formSubjectId === "" || formClassId === "") {
      toast.error("Subject and class are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/curriculum/", {
        subject_id: formSubjectId,
        class_id: formClassId,
        description: formDescription || null,
        teaching_hours: formTeachingHours === "" ? null : Number(formTeachingHours),
      });
      setOpen(false);
      resetForm();
      await fetchCurriculum();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create curriculum");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/curriculum/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchCurriculum();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete curriculum");
    } finally {
      setDeleting(false);
    }
  };

  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name || `#${id}`;
  const className = (id: number) => {
    const c = classes.find((cl) => cl.id === id);
    return c ? `${c.name} ${c.section || ""}`.trim() : `#${id}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading curriculum…</div></div>;
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
        title="Curriculum"
        subtitle="Manage subject coverage per class"
        icon={BookMarked}
        action={
          <button onClick={() => { resetForm(); setOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Curriculum
          </button>
        }
      />

      {curriculum.length === 0 ? (
        <div className="card text-center py-8">
          <BookMarked className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No curriculum found.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teaching Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {curriculum.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subjectName(c.subject_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{className(c.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Clock className="h-4 w-4 inline mr-1 text-gray-400" />{c.teaching_hours ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.description || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => setDeleteTarget(c)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{curriculum.length} curriculum item(s)</p>
        </div>
      )}

      <Modal open={open} title="New Curriculum" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
            <select
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value ? Number(e.target.value) : "")}
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
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.section || ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Teaching Hours</label>
            <input
              type="number"
              min={0}
              value={formTeachingHours}
              onChange={(e) => setFormTeachingHours(e.target.value)}
              placeholder="e.g. 60"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              placeholder="Curriculum details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Curriculum"
        message="Are you sure you want to delete this curriculum item? This cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}