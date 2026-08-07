"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck, MailOpen } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";

interface NotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

function notifyNavbar() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications-updated"));
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/notifications/");
      setNotifications(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleRead = async (n: NotificationRecord) => {
    if (n.is_read) return;
    setMarkingId(n.id);
    try {
      await api.post(`/notifications/${n.id}/read`);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      notifyNavbar();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not mark as read");
    } finally {
      setMarkingId(null);
    }
  };

  const handleReadAll = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
      notifyNavbar();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading notifications…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Your notifications"
        icon={Bell}
        action={
          unreadCount > 0 ? (
            <button onClick={handleReadAll} disabled={markingAll} className="btn-primary flex items-center gap-2">
              <CheckCheck className="h-4 w-4" /> {markingAll ? "Marking…" : "Mark all as read"}
            </button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total" value={notifications.length} icon={Bell} />
        <StatCard title="Unread" value={unreadCount} icon={MailOpen} />
        <StatCard title="Read" value={notifications.length - unreadCount} icon={CheckCheck} />
      </div>
      {notifications.length === 0 ? (
        <div className="card text-center py-8"><Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No notifications.</p></div>
      ) : (
        <div className="card">
          <ul className="divide-y divide-gray-200">
            {notifications.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((n) => (
              <li key={n.id} className={`px-4 py-3 flex items-start gap-3 ${n.is_read ? "bg-white" : "bg-blue-50"}`}>
                <Bell className={`h-5 w-5 mt-0.5 ${n.is_read ? "text-gray-400" : "text-blue-600"}`} />
                <button onClick={() => handleRead(n)} disabled={n.is_read || markingId === n.id} className={`flex-1 min-w-0 text-left ${n.is_read ? "" : "cursor-pointer"}`}>
                  <p className={`text-sm font-medium ${n.is_read ? "text-gray-700" : "text-gray-900"}`}>{n.title}</p>
                  {n.message && <p className="text-sm text-gray-600 truncate">{n.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">{n.type || "general"} · {new Date(n.created_at).toLocaleString()}</p>
                </button>
                {!n.is_read && (
                  <button onClick={() => handleRead(n)} disabled={markingId === n.id} className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0 mt-0.5" title="Mark as read">
                    {markingId === n.id ? "…" : "Mark read"}
                  </button>
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