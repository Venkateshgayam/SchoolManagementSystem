"use client";

import { useState, useEffect } from "react";
import { Bell, Send, User } from "lucide-react";
import api from "@/lib/api";

interface NotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
}
interface UserRecord { id: number; email: string; username: string; role: string; full_name: string; }

const NOTIFICATION_TYPES = ["general", "announcement", "fee", "exam", "attendance"];

export default function SuperAdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ user_id: "", title: "", message: "", type: "general" });

  useEffect(() => {
    Promise.all([
      api.get("/notifications/all").then((res) => setNotifications(res.data)),
      api.get("/users/").then((res) => setUsers(res.data)),
    ]).catch((err: any) => setError(err?.message || "Failed to load notifications")).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id) return;
    setSaving(true);
    try {
      await api.post("/notifications/", {
        user_id: Number(form.user_id),
        title: form.title,
        message: form.message || null,
        type: form.type,
      });
      setForm({ user_id: "", title: "", message: "", type: "general" });
      const res = await api.get("/notifications/all");
      setNotifications(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not create notification");
    } finally {
      setSaving(false);
    }
  };

  const sorted = notifications.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
      <div className="card mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Send Notification</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
              <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required className="input">
                <option value="">Select a user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username || u.email} ({u.role} · #{u.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={255} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <input type="text" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !form.user_id || !form.title} className="btn-primary">{saving ? "Sending…" : <span className="flex items-center gap-1"><Send className="h-4 w-4" />Send</span>}</button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading notifications…</div></div>
      ) : error ? (
        <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>
      ) : sorted.length === 0 ? (
        <div className="card text-center py-8"><Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No notifications found.</p></div>
      ) : (
        <div className="card">
          <ul className="divide-y divide-gray-200">
            {sorted.map((n) => (
              <li key={n.id} className={`px-4 py-3 flex items-start gap-3 ${n.is_read ? "bg-white" : "bg-blue-50"}`}>
                <Bell className={`h-5 w-5 mt-0.5 ${n.is_read ? "text-gray-400" : "text-blue-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.is_read ? "text-gray-700" : "text-gray-900"}`}>{n.title}</p>
                  {n.message && <p className="text-sm text-gray-600 truncate">{n.message}</p>}
                  <p className="text-xs text-gray-500 mt-1"><User className="h-3 w-3 inline mr-1" />user #{n.user_id} · {n.type || "general"} · {new Date(n.created_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-600">{sorted.length} notification(s)</p>
        </div>
      )}
    </div>
  );
}
