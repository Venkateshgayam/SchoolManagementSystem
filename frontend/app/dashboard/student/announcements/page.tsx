"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import { Bell, EyeOff } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

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

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const res = await api.get("/announcements/");
        setAnnouncements(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load announcements");
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  const handleDismiss = async (id: number) => {
    setDismissingId(id);
    try {
      await api.post(`/announcements/${id}/dismiss`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement dismissed");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to dismiss announcement");
    } finally {
      setDismissingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading announcements...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Announcements</h1>

      {announcements.length === 0 ? (
        <div className="card text-center py-8">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No announcements found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((announcement) => (
              <div key={announcement.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {announcement.is_pinned && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mr-2">
                        Pinned
                      </span>
                    )}
                    {announcement.title}
                  </h3>
                  <button
                    onClick={() => handleDismiss(announcement.id)}
                    disabled={dismissingId === announcement.id}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors inline-flex items-center gap-1 text-xs shrink-0"
                    title="Dismiss for me"
                  >
                    <EyeOff className="h-4 w-4" />
                    <span>Dismiss</span>
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">{announcement.content}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {formatDate(announcement.created_at)}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}