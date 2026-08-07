"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck, User } from "lucide-react";
import api from "@/lib/api";

interface NotificationRecord { id: number; user_id: number; title: string; message: string | null; type: string | null; is_read: boolean; created_at: string; }

export default function ManagementNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    api.get("/notifications/").then((res) => setNotifications(res.data)).catch((err) => setError(err?.message || "Failed to load notifications")).finally(() => setLoading(false));
  }, []);

  const markRead = async (id: number) => {
    setUpdating(id);
    try {
      const res = await api.put(`/notifications/${id}`, { is_read: true });
      setNotifications((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err: any) { alert(err?.response?.data?.detail || err?.message || "Could not update"); }
    finally { setUpdating(null); }
  };

  const markAll = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    setUpdating(-1);
    try {
      await Promise.all(unread.map((n) => api.put(`/notifications/${n.id}`, { is_read: true })));
      setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err: any) { alert(err?.response?.data?.detail || err?.message || "Could not update"); }
    finally { setUpdating(null); }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading notifications…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
      {unreadCount > 0 && (
        <div className="flex justify-end mb-4"><button onClick={markAll} disabled={updating === -1} className="btn-primary">{updating === -1 ? "Marking…" : `Mark all as read`}</button></div>
      )}
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
                  <p className="text-xs text-gray-500 mt-1"><User className="h-3 w-3 inline mr-1" />user #{n.user_id} · {n.type || "general"} · {new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} disabled={updating === n.id} className="text-xs text-blue-600 hover:text-blue-800">{updating === n.id ? "..." : "Mark read"}</button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-600">{notifications.length} notification(s) · {unreadCount} unread</p>
        </div>
      )}
    </div>
  );
}
