"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Plus, Save, Search, Mail, BookOpen, Pencil, Trash2, Eye } from "lucide-react";
import { formatStudentNameId } from "@/lib/formatters";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import PageLoader from "@/components/dashboard/PageLoader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PasswordInput from "@/components/ui/PasswordInput";
import { can } from "@/lib/permissions";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface StudentRecord {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  username: string | null;
  roll_number: string | null;
  class_id: number | null;
  parent_email: string | null;
  address: string | null;
  date_of_birth: string | null;
  enrollment_date: string;
  status: string;
}

interface ClassRecord {
  id: number;
  name: string;
  section: string | null;
}

interface FormState {
  full_name: string;
  email: string;
  username: string;
  password: string;
  roll_number: string;
  class_id: number | "";
  parent_email: string;
  address: string;
  date_of_birth: string;
  enrollment_date: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  username: "",
  password: "",
  roll_number: "",
  class_id: "",
  parent_email: "",
  address: "",
  date_of_birth: "",
  enrollment_date: "",
  status: "active",
};

export default function StudentsManager() {
  const [perm, setPerm] = useState({ create: false, update: false, del: false });
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  const pathname = usePathname();
  const role = pathname.split("/")[2] || "admin";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    setPerm({ create: can("student:create"), update: can("student:update"), del: can("student:delete") });
  }, []);

  const fetchData = async () => {
    const [s, c] = await Promise.all([
      api.get("/students/").catch(() => ({ data: [] })),
      api.get("/classes/").catch(() => ({ data: [] })),
    ]);
    setStudents(s.data);
    setClasses(c.data);
  };

  useEffect(() => {
    fetchData()
      .catch((err: any) => setError(err?.message || "Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        (s.roll_number || "").toLowerCase().includes(q) ||
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const className = (id: number | null) => {
    const c = classes.find((cl) => cl.id === id);
    return c ? `${c.name} ${c.section || ""}`.trim() : id === null ? "N/A" : `#${id}`;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (student: StudentRecord) => {
    setEditing(student);
    setForm({
      full_name: student.full_name || "",
      email: student.email || "",
      username: student.username || "",
      password: "",
      roll_number: student.roll_number || "",
      class_id: student.class_id ?? "",
      parent_email: student.parent_email || "",
      address: student.address || "",
      date_of_birth: student.date_of_birth ? student.date_of_birth.slice(0, 10) : "",
      enrollment_date: student.enrollment_date ? student.enrollment_date.slice(0, 10) : "",
      status: student.status,
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
        roll_number: form.roll_number || null,
        class_id: form.class_id === "" ? null : form.class_id,
        parent_email: form.parent_email || null,
        address: form.address || null,
        date_of_birth: form.date_of_birth || null,
        enrollment_date: form.enrollment_date || null,
        status: form.status,
      };
      if (editing) {
        delete body.email;
        delete body.username;
        if (!form.password) delete body.password;
        await api.put(`/students/${editing.id}`, body);
        toast.success("Student updated successfully.");
      } else {
        await api.post("/students/", body);
        toast.success("Student created successfully.");
      }
      setOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || (editing ? "Failed to update student." : "Failed to create student."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/students/${deleteTarget.id}`);
      toast.success("Student deleted successfully.");
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete student.");
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
        title="Students"
        subtitle="Manage student records and accounts"
        icon={Users}
        action={
          perm.create ? (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Student
            </button>
          ) : undefined
        }
      />

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{search ? "No students match your search." : "No students found."}</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((s) => (
                  <tr key={s.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatStudentNameId(s.full_name, s.id, s.roll_number)}</div>
                      <div className="text-xs text-gray-500">{s.email || `user#${s.user_id}`}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.roll_number || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{className(s.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={s.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Link href={`/dashboard/${role}/students/${s.id}`} className="text-gray-500 hover:text-blue-600 mr-3 inline-block" title="View student profile">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {perm.update && (
                          <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-primary-600 mr-3 inline-block" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {perm.del && (
                          <button onClick={() => setDeleteTarget(s)} className="text-gray-500 hover:text-red-600 inline-block" title="Delete">
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
          <p className="mt-4 text-sm text-gray-600">{students.length} student(s)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Student" : "New Student"} onClose={() => setOpen(false)} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Jane Doe" className="input-field" />
            </div>
            <div>
              <label className="label">Roll Number</label>
              <input type="text" value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })} placeholder="e.g. STU-2026-001" className="input-field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} placeholder="student@example.com" className="input-field disabled:bg-gray-100 disabled:text-gray-400" />
              {editing && <p className="text-xs text-gray-400 mt-1">Email changes are handled in user management.</p>}
            </div>
            <div>
              <label className="label">Username</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} placeholder="e.g. jane.doe" className="input-field disabled:bg-gray-100 disabled:text-gray-400" />
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
              <label className="label">Class</label>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value ? Number(e.target.value) : "" })} className="input-field">
                <option value="">No class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.section || ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Parent Email</label>
              <input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} placeholder="parent@example.com" className="input-field" />
            </div>
            <div>
              <label className="label">Address</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. 123 Main St, City" className="input-field" />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Enrollment Date</label>
              <input type="date" value={form.enrollment_date} onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })} className="input-field" />
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
        title="Delete Student"
        message={`Delete ${deleteTarget?.full_name || `student #${deleteTarget?.id}`}? This will also remove their login account and cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
