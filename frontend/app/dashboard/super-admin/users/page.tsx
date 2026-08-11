"use client";

import { useState, useEffect } from "react";
import { Users, Pencil, Trash2, ShieldAlert, Plus, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import PasswordInput from "@/components/ui/PasswordInput";

interface UserRecord {
  id: number;
  email: string;
  username: string;
  role: string;
  full_name: string;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLES = ["super_admin", "admin", "management", "teacher", "student"];

interface FormState {
  email: string;
  username: string;
  full_name: string;
  phone_number: string;
  role: string;
  is_active: boolean;
  password: string;
}

const EMPTY_FORM: FormState = {
  email: "",
  username: "",
  full_name: "",
  phone_number: "",
  role: "student",
  is_active: true,
  password: "",
};

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const currentUser = typeof window !== "undefined" ? getUser() : null;
  const currentUserId = currentUser?.id;

  const load = async () => {
    try {
      const res = await api.get("/users/");
      setUsers(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const openEdit = (u: UserRecord) => {
    setCreating(false);
    setEditing(u);
    setForm({
      email: u.email,
      username: u.username,
      full_name: u.full_name,
      phone_number: u.phone_number || "",
      role: u.role,
      is_active: u.is_active,
      password: "",
    });
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/register", {
        email: form.email,
        username: form.username,
        password: form.password,
        role: form.role,
        full_name: form.full_name,
        phone_number: form.phone_number || null,
      });
      toast.success("User created successfully.");
      closeModal();
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/users/${editing.id}`, {
        email: form.email,
        username: form.username,
        full_name: form.full_name,
        phone_number: form.phone_number || null,
        role: form.role,
        is_active: form.is_active,
      });
      toast.success("User updated successfully.");
      closeModal();
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not update user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.delete(`/users/${confirmDelete.id}`);
      toast.success("User deleted successfully.");
      setUsers((p) => p.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (u: UserRecord) => u.id !== currentUserId;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage user accounts and roles"
        icon={Users}
        action={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New User
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading users…</div></div>
      ) : error ? (
        <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={load} className="btn-primary">Retry</button></div>
      ) : users.length === 0 ? (
        <div className="card text-center py-8"><Users className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No users found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.full_name}
                      {u.id === currentUserId && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.phone_number || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{u.is_active ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:text-blue-800 mr-3"><Pencil className="h-4 w-4 inline" /> Edit</button>
                      {canDelete(u) ? (
                        <button onClick={() => setConfirmDelete(u)} className="text-xs text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4 inline" /> Delete</button>
                      ) : (
                        <span className="text-xs text-gray-400 inline-flex items-center gap-1" title="You cannot delete your own account"><ShieldAlert className="h-4 w-4" />Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{users.length} user(s)</p>
        </div>
      )}

      <Modal open={creating || editing !== null} title={creating ? "New User" : editing ? `Edit User — ${editing.full_name}` : "User"} onClose={closeModal} maxWidth="max-w-2xl">
        <form onSubmit={creating ? handleCreate : handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="input-field" />
            </div>
            <div>
              <label className="label">Username</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="input-field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="input-field" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="text" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <PasswordInput
                id="password"
                label={creating ? "Password" : "New Password (optional)"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={creating ? "At least 8 characters" : "Leave blank to keep current"}
                required={creating}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Account active</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : creating ? "Create User" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete User"
        message={`Delete ${confirmDelete?.full_name || confirmDelete?.username || `user #${confirmDelete?.id}`}? This action is destructive and cannot be undone.`}
        loading={deletingId !== null}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
