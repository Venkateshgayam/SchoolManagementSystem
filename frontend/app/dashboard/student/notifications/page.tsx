"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
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

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await api.get("/notifications/");
        setNotifications(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  const markRead = async (notification: NotificationRecord) => {
    if (notification.is_read || updatingId !== null) return;
    setUpdatingId(notification.id);
    try {
      await api.post(`/notifications/${notification.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event("notifications-updated"));
    } catch {
      setError("Failed to update notification");
    } finally {
      setUpdatingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Notifications
        {unreadCount > 0 && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {unreadCount} unread
          </span>
        )}
      </h1>

      {notifications.length === 0 ? (
        <div className="card text-center py-8">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((notification) => (
              <div
                key={notification.id}
                onClick={() => markRead(notification)}
                className={`card ${!notification.is_read ? "border-l-4 border-l-primary-500 cursor-pointer hover:shadow-md transition-shadow" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                  {!notification.is_read && (
                    <span className="ml-2 flex-shrink-0 text-xs font-medium text-primary-600">
                      {updatingId === notification.id ? "Marking read..." : "Click to mark as read"}
                    </span>
                  )}
                </div>
                {notification.message && (
                  <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}