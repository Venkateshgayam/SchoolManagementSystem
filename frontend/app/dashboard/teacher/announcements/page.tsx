"use client";

import { useState, useEffect } from "react";
import { Megaphone, Save, PlusCircle, Users, Trash2, EyeOff } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface TeacherInfo {
  id: number;
  user_id: number;
}

interface AnnouncementInfo {
  id: number;
  title: string;
  content: string | null;
  target_role: string;
  created_by: number | null;
  created_at: string;
}

export default function TeacherAnnouncementsPage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTarget, setFormTarget] = useState("all");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, announcementsRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/announcements/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setAnnouncements(announcementsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load announcements");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const myAnnouncements = announcements.filter((a) => {
    if (!teacher) return false;
    if (a.created_by === teacher.user_id) return true;
    return a.target_role === "all" || a.target_role === "teachers" || a.target_role === null;
  });

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormTarget("all");
  };

  const createAnnouncement = async () => {
    if (!teacher || !formTitle) {
      setMessage("Please enter a title.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/announcements/", {
        title: formTitle,
        content: formContent || null,
        target_role: formTarget,
        created_by: teacher.user_id,
      });
      setMessage("Announcement created.");
      const res = await api.get("/announcements/");
      setAnnouncements(res.data);
      resetForm();
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/announcements/${id}/dismiss`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement dismissed");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to dismiss announcement");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this announcement for everyone?")) return;
    setActionLoadingId(id);
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete announcement");
    } finally {
      setActionLoadingId(null);
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

  if (!teacher) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600">Teacher profile not available.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Announcements</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle className="h-5 w-5" /> Create Announcement
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Content</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={3}
              placeholder="Write announcement details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Target Audience</label>
            <select
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Users</option>
              <option value="teachers">Teachers</option>
              <option value="students">Students</option>
              <option value="admin">Admin</option>

            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={createAnnouncement}
              disabled={!formTitle || saving}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`card mb-6 ${
            message.includes("Failed") || message.includes("Please")
              ? "border-danger-200 bg-danger-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-sm ${
              message.includes("Failed") || message.includes("Please")
                ? "text-danger-600"
                : "text-green-800"
            }`}
          >
            {message}
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Announcements for Teachers
        </h2>
        {myAnnouncements.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No announcements available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myAnnouncements
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((a) => (
                <div key={a.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full mt-1 ${
                          a.target_role === "all"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {a.target_role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDismiss(a.id)}
                        disabled={actionLoadingId === a.id}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors inline-flex items-center gap-1 text-xs"
                        title="Dismiss for me"
                      >
                        <EyeOff className="h-4 w-4" />
                        <span>Dismiss</span>
                      </button>
                      {teacher && a.created_by === teacher.user_id && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={actionLoadingId === a.id}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors inline-flex items-center gap-1 text-xs"
                          title="Delete announcement for everyone"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {a.content && <p className="text-gray-600 mt-2 text-sm">{a.content}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    Posted {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
