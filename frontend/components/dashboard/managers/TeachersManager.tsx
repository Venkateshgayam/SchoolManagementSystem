"use client";

import { useState, useEffect, useMemo } from "react";
import { UserCheck, Plus, Save, Search, Award, Calendar, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PasswordInput from "@/components/ui/PasswordInput";
import { can } from "@/lib/permissions";

interface TeacherRecord {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  username: string | null;
  qualification: string | null;
  experience_years: number | null;
  employment_date: string;
  status: string;
}

interface FormState {
  full_name: string;
  email: string;
  username: string;
  password: string;
  qualification: string;
  experience_years: string;
  employment_date: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  username: "",
  password: "",
  qualification: "",
  experience_years: "",
  employment_date: "",
  status: "active",
};

export default function TeachersManager() {
  const [perm, setPerm] = useState({ create: false, update: false, del: false });
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    setPerm({ create: can("teacher:create"), update: can("teacher:update"), del: can("teacher:delete") });
  }, []);

  const fetchData = async () => {
    const res = await api.get("/teachers/");
    setTeachers(res.data);
  };

  useEffect(() => {
    fetchData()
      .catch((err: any) => setError(err?.message || "Failed to load teachers"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      (t) =>
        (t.full_name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.qualification || "").toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (teacher: TeacherRecord) => {
    setEditing(teacher);
    setForm({
      full_name: teacher.full_name || "",
      email: teacher.email || "",
      username: teacher.username || "",
      password: "",
      qualification: teacher.qualification || "",
      experience_years: teacher.experience_years?.toString() ?? "",
      employment_date: teacher.employment_date ? teacher.employment_date.slice(0, 10) : "",
      status: teacher.status,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!editing && !form.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!editing && !form.username.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (!editing && form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        username: form.username.trim() || null,
        password: form.password || null,
        qualification: form.qualification || null,
        experience_years: form.experience_years === "" ? null : Number(form.experience_years),
        employment_date: form.employment_date || null,
        status: form.status,
      };
      if (editing) {
        delete body.email;
        delete body.username;
        if (!form.password) delete body.password;
        await api.put(`/teachers/${editing.id}`, body);
        toast.success("Teacher updated successfully.");
      } else {
        await api.post("/teachers/", body);
        toast.success("Teacher created successfully.");
      }
      setOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || (editing ? "Failed to update teacher." : "Failed to create teacher."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/teachers/${deleteTarget.id}`);
      toast.success("Teacher deleted successfully.");
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete teacher.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading teachers…</div></div>;
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
        title="Teachers"
        subtitle="Manage teacher records and accounts"
        icon={UserCheck}
        action={
          perm.create ? (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Teacher
            </button>
          ) : undefined
        }
      />

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or qualification..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{search ? "No teachers match your search." : "No teachers found."}</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualification</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {(perm.update || perm.del) && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{t.full_name || `Teacher #${t.id}`}</div>
                      <div className="text-xs text-gray-500">{t.email || `user#${t.user_id}`}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Award className="h-4 w-4 inline mr-1 text-gray-400" />{t.qualification || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.experience_years ?? "—"} yr(s)</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{new Date(t.employment_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={t.status} /></td>
                    {(perm.update || perm.del) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {perm.update && (
                          <button onClick={() => openEdit(t)} className="text-gray-500 hover:text-primary-600 mr-3" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {perm.del && (
                          <button onClick={() => setDeleteTarget(t)} className="text-gray-500 hover:text-red-600" title="Delete">
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
          <p className="mt-4 text-sm text-gray-600">{teachers.length} teacher(s)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Teacher" : "New Teacher"} onClose={() => setOpen(false)} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. John Smith" className="input-field" />
            </div>
            <div>
              <label className="label">Qualification</label>
              <input type="text" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. M.Sc. Mathematics, B.Ed." className="input-field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} placeholder="teacher@example.com" className="input-field disabled:bg-gray-100 disabled:text-gray-400" />
              {editing && <p className="text-xs text-gray-400 mt-1">Email changes are handled in user management.</p>}
            </div>
            <div>
              <label className="label">Username</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} placeholder="e.g. john.smith" className="input-field disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
            <div>
              <PasswordInput
                id="password"
                label={editing ? "New Password (optional)" : "Password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "Leave blank to keep current" : "At least 8 characters"}
              />
            </div>
            <div>
              <label className="label">Experience (years)</label>
              <input type="number" min={0} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} placeholder="e.g. 5" className="input-field" />
            </div>
            <div>
              <label className="label">Employment Date</label>
              <input type="date" value={form.employment_date} onChange={(e) => setForm({ ...form, employment_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
        title="Delete Teacher"
        message={`Delete ${deleteTarget?.full_name || `teacher #${deleteTarget?.id}`}? This will also remove their login account and cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
