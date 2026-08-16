"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, User, Trash2 } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import Modal from "@/components/dashboard/Modal";
import toast from "react-hot-toast";

interface NotificationRecord { id: number; user_id: number; title: string; message: string | null; type: string | null; is_read: boolean; created_at: string; }
interface UserRecord { id: number; email: string; full_name: string; role: string; }

const TYPES = ["general", "attendance", "fee", "leave", "exam", "announcement"];

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ user_id: "", title: "", message: "", type: "general" });

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((x) => x.id !== id));
      toast.success("Notification deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Could not delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  const load = async () => {
    try {
      const [n, u] = await Promise.all([
        api.get("/notifications/all").catch(() => ({ data: [] })),
        api.get("/users/").catch(() => ({ data: [] })),
      ]);
      setNotifications(n.data); setUsers(u.data);
    } catch (err: any) { setError(err?.message || "Failed to load notifications"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/notifications/", {
        user_id: Number(form.user_id),
        title: form.title,
        message: form.message || null,
        type: form.type,
      });
      setModalOpen(false);
      setForm({ user_id: "", title: "", message: "", type: "general" });
      await load();
    } catch (err: any) { toast.error(err?.response?.data?.detail || err?.message || "Could not create notification"); }
    finally { setSaving(false); }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading notifications…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Send and review system notifications"
        icon={Bell}
        action={<button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-1"><Plus className="h-4 w-4" /> New Notification</button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Sent" value={notifications.length} icon={Bell} />
        <StatCard title="Unread" value={unreadCount} icon={Bell} />
        <StatCard title="Recipients" value={new Set(notifications.map((n) => n.user_id)).size} icon={User} />
      </div>
      {notifications.length === 0 ? (
        <div className="card text-center py-8"><Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No notifications.</p></div>
      ) : (
        <div className="card">
          <ul className="divide-y divide-gray-200">
            {notifications.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((n) => (
              <li key={n.id} className={`px-4 py-3 flex items-start gap-3 ${n.is_read ? "bg-white" : "bg-blue-50"}`}>
                <Bell className={`h-5 w-5 mt-0.5 ${n.is_read ? "text-gray-400" : "text-blue-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.is_read ? "text-gray-700" : "text-gray-900"}`}>{n.title}</p>
                  {n.message && <p className="text-sm text-gray-600 truncate">{n.message}</p>}
                  <p className="text-xs text-gray-500 mt-1"><User className="h-3 w-3 inline mr-1" />{n.type || "general"} · {new Date(n.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  disabled={deletingId === n.id}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0 mt-0.5"
                  title="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-600">{notifications.length} notification(s) · {unreadCount} unread</p>
        </div>
      )}

      <Modal open={modalOpen} title="New Notification" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
            <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white">
              <option value="">Select user</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={255} className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-solid border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !form.user_id || !form.title} className="btn-primary">{saving ? "Sending…" : "Send"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}