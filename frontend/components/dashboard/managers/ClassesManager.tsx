"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Plus, Save, Search, Pencil, Trash2, Users, Eye } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import PageLoader from "@/components/dashboard/PageLoader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { can } from "@/lib/permissions";
import { useSettings } from "@/hooks/useSettings";

interface ClassRecord {
  id: number;
  name: string;
  section: string | null;
  academic_year: string | null;
  teacher_id: number | null;
  school_id: number | null;
  capacity: number | null;
  fee_amount: number;
}

interface TeacherRecord {
  id: number;
  full_name: string | null;
  user_id: number;
}

interface FormState {
  name: string;
  section: string;
  academic_year: string;
  teacher_id: number | "";
  capacity: string;
  fee_amount: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  section: "",
  academic_year: "",
  teacher_id: "",
  capacity: "",
  fee_amount: "",
};

export default function ClassesManager() {
  const [perm, setPerm] = useState({ create: false, update: false, del: false });
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  const { settings } = useSettings();
  const currencySymbol = settings.currency_symbol || "$";
  const formatCurrency = (amount: number) => `${currencySymbol}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const pathname = usePathname();
  const role = pathname.split("/")[2] || "admin";

  useEffect(() => {
    setPerm({ create: can("class:create"), update: can("class:update"), del: can("class:delete") });
  }, []);

  const fetchData = async () => {
    const [c, t] = await Promise.all([
      api.get("/classes/").catch(() => ({ data: [] })),
      api.get("/teachers/").catch(() => ({ data: [] })),
    ]);
    setClasses(c.data);
    setTeachers(t.data);
  };

  useEffect(() => {
    fetchData()
      .catch((err: any) => setError(err?.message || "Failed to load classes"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return classes;
    const q = search.toLowerCase();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.section || "").toLowerCase().includes(q) ||
        (c.academic_year || "").toLowerCase().includes(q)
    );
  }, [classes, search]);

  const teacherName = (id: number | null) => {
    if (id === null) return "Unassigned";
    const t = teachers.find((x) => x.id === id);
    return t ? (t.full_name || `Teacher #${t.id}`) : `Teacher #${id}`;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: ClassRecord) => {
    setEditing(c);
    setForm({
      name: c.name,
      section: c.section || "",
      academic_year: c.academic_year || "",
      teacher_id: c.teacher_id ?? "",
      capacity: c.capacity?.toString() ?? "",
      fee_amount: c.fee_amount?.toString() ?? "0",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Class name is required.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        section: form.section || null,
        academic_year: form.academic_year || null,
        teacher_id: form.teacher_id === "" ? null : form.teacher_id,
        capacity: form.capacity === "" ? null : Number(form.capacity),
        fee_amount: Number(form.fee_amount) || 0.0,
      };
      if (editing) {
        await api.put(`/classes/${editing.id}`, body);
        toast.success("Class updated successfully.");
      } else {
        await api.post("/classes/", body);
        toast.success("Class created successfully.");
      }
      setOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || (editing ? "Failed to update class." : "Failed to create class."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/classes/${deleteTarget.id}`);
      toast.success("Class deleted successfully.");
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete class.");
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
        title="Classes"
        subtitle="Manage class sections"
        icon={BookOpen}
        action={
          perm.create ? (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Class
            </button>
          ) : undefined
        }
      />

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, section or academic year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{search ? "No classes match your search." : "No classes found."}</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Teacher</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((c) => (
                  <tr key={c.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.section || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.academic_year || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.capacity ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(c.fee_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Users className="h-4 w-4 inline mr-1 text-gray-400" />{teacherName(c.teacher_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/${role}/classes/${c.id}`}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors border border-blue-200 inline-flex items-center justify-center"
                          title="Click here for class details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {perm.update && (
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 rounded-md transition-colors border border-amber-200 inline-flex items-center justify-center"
                            title="Edit Class"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {perm.del && (
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-md transition-colors border border-red-200 inline-flex items-center justify-center"
                            title="Delete Class"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{classes.length} class(es)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Class" : "New Class"} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 10" className="input-field" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Section</label>
              <input type="text" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" className="input-field" />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input type="text" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2025-2026" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Capacity</label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 40" className="input-field" />
            </div>
            <div>
              <label className="label">Base Fee Amount ({currencySymbol})</label>
              <input type="number" min={0} step="0.01" value={form.fee_amount} onChange={(e) => setForm({ ...form, fee_amount: e.target.value })} placeholder="e.g. 15000" className="input-field" />
            </div>
            <div>
              <label className="label">Class Teacher</label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value ? Number(e.target.value) : "" })} className="input-field">
                <option value="">No teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name || `Teacher #${t.id}`}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Class"
        message={`Delete ${deleteTarget?.name || `class #${deleteTarget?.id}`}? Students in this class will be unassigned. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
