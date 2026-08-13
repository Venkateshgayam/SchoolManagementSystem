"use client";

import { formatDate } from "@/lib/formatters";
import { useState, useEffect } from "react";
import { Megaphone, Pin, Calendar, Trash2 } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";

interface AnnouncementRecord { id: number; title: string; content: string; created_by: number | null; target_role: string | null; created_at: string; expires_at: string | null; is_pinned: boolean; }

const TARGET_ROLES = ["all", "student", "teacher", "admin"];

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AnnouncementRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target_role: "all", expires_at: "", is_pinned: false });

  const load = async () => {
    try { const res = await api.get("/announcements/"); setAnnouncements(res.data); }
    catch (err: any) { setError(err?.message || "Failed to load announcements"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const togglePin = async (a: AnnouncementRecord) => {
    try { await api.put(`/announcements/${a.id}`, { is_pinned: !a.is_pinned }); setAnnouncements((p) => p.map((x) => x.id === a.id ? { ...x, is_pinned: !x.is_pinned } : x)); }
    catch (err: any) { toast.error(err?.response?.data?.detail || err?.message || "Could not update"); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/announcements/", { ...form, expires_at: form.expires_at || null });
      setModalOpen(false);
      setForm({ title: "", content: "", target_role: "all", expires_at: "", is_pinned: false });
      await load();
    } catch (err: any) { toast.error(err?.response?.data?.detail || err?.message || "Could not create announcement"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/announcements/${deleting.id}`);
      setAnnouncements((p) => p.filter((a) => a.id !== deleting.id));
      setDeleting(null);
    } catch (err: any) { toast.error(err?.response?.data?.detail || err?.message || "Could not delete announcement"); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading announcements…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Publish, pin and remove school announcements"
        icon={Megaphone}
        action={<button onClick={() => setModalOpen(true)} className="btn-primary">New Announcement</button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Announcements" value={announcements.length} icon={Megaphone} />
        <StatCard title="Pinned" value={announcements.filter((a) => a.is_pinned).length} icon={Pin} />
        <StatCard title="Active" value={announcements.filter((a) => !a.expires_at || new Date(a.expires_at) >= new Date()).length} icon={Calendar} />
      </div>
      {announcements.length === 0 ? (
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
                    <td className="px-6 py-4 whitespace-nowrap">{a.is_pinned ? <Pin className="h-4 w-4 text-yellow-500" /> : <span className="h-4 w-4 inline-block" />}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.target_role || "all"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{formatDate(a.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.expires_at ? formatDate(a.expires_at) : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                      <button onClick={() => togglePin(a)} className="text-xs text-blue-600 hover:text-blue-800">{a.is_pinned ? "Unpin" : "Pin"}</button>
                      <button onClick={() => setDeleting(a)} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-0.5"><Trash2 className="h-3 w-3" />Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{announcements.length} announcement(s)</p>
        </div>
      )}

      <Modal open={modalOpen} title="New Announcement" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={255} className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
              <select value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })} className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white">
                {TARGET_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pinned</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !form.title || !form.content} className="btn-primary">{saving ? "Saving…" : "Publish"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete announcement"
        message={`Are you sure you want to delete "${deleting?.title}"? This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}