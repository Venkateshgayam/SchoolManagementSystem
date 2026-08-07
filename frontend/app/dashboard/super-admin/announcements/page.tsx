"use client";

import { useState, useEffect } from "react";
import { Megaphone, Pin, Calendar, Trash2 } from "lucide-react";
import api from "@/lib/api";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";

interface AnnouncementRecord {
  id: number;
  title: string;
  content: string;
  created_by: number | null;
  target_role: string | null;
  created_at: string;
  expires_at: string | null;
  is_pinned: boolean;
}

const TARGET_ROLES = ["all", "student", "teacher", "management", "admin", "super_admin"];

export default function SuperAdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AnnouncementRecord | null>(null);
  const [form, setForm] = useState({ title: "", content: "", target_role: "all", expires_at: "", is_pinned: false });

  const load = async () => {
    try {
      const res = await api.get("/announcements/");
      setAnnouncements(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePin = async (a: AnnouncementRecord) => {
    try {
      await api.put(`/announcements/${a.id}`, { is_pinned: !a.is_pinned });
      setAnnouncements((p) => p.map((x) => (x.id === a.id ? { ...x, is_pinned: !x.is_pinned } : x)));
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not update");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/announcements/", { ...form, expires_at: form.expires_at || null });
      setForm({ title: "", content: "", target_role: "all", expires_at: "", is_pinned: false });
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not create announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.delete(`/announcements/${confirmDelete.id}`);
      setAnnouncements((p) => p.filter((x) => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReset = () => setForm({ title: "", content: "", target_role: "all", expires_at: "", is_pinned: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Announcements</h1>
      <div className="card mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">New Announcement</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={255} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
              <select value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })} className="input">
                {TARGET_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className="input" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="input" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pinned</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleReset} className="btn-secondary">Clear</button>
            <button type="submit" disabled={saving || !form.title || !form.content} className="btn-primary">{saving ? "Saving…" : "Publish"}</button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading announcements…</div></div>
      ) : error ? (
        <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={load} className="btn-primary">Retry</button></div>
      ) : announcements.length === 0 ? (
        <div className="card text-center py-8"><Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No announcements yet.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pinned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {announcements.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((a) => (
                  <tr key={a.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{a.is_pinned ? <Pin className="h-4 w-4 text-yellow-500" /> : <span className="h-4 w-4" />}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.target_role || "all"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.expires_at ? new Date(a.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => togglePin(a)} className="text-xs text-blue-600 hover:text-blue-800 mr-3">{a.is_pinned ? "Unpin" : "Pin"}</button>
                      <button onClick={() => setConfirmDelete(a)} className="text-xs text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4 inline" /> Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{announcements.length} announcement(s)</p>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Announcement"
        message={`Delete "${confirmDelete?.title}"? This cannot be undone.`}
        loading={deletingId !== null}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
