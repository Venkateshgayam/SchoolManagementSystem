"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Save, Tag, FileText } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string | null;
}

export default function AdminAcademicCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEventDate, setFormEventDate] = useState("");
  const [formEventType, setFormEventType] = useState("");

  const fetchEvents = async () => {
    const res = await api.get("/academic-calendar/");
    setEvents(res.data);
  };

  useEffect(() => {
    api.get("/academic-calendar/")
      .then((res) => setEvents(res.data))
      .catch((err: any) => setError(err?.message || "Failed to load calendar events"))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormEventDate("");
    setFormEventType("");
  };

  const handleCreate = async () => {
    if (!formTitle) {
      alert("Event title is required.");
      return;
    }
    if (!formEventDate) {
      alert("Event date is required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/academic-calendar/", {
        title: formTitle,
        description: formDescription || null,
        event_date: formEventDate,
        event_type: formEventType || null,
      });
      setOpen(false);
      resetForm();
      await fetchEvents();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create calendar event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading academic calendar…</div></div>;
  }
  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Academic Calendar"
        subtitle="Manage school events and important dates"
        icon={Calendar}
        action={
          <button onClick={() => { resetForm(); setOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Event
          </button>
        }
      />

      {events.length === 0 ? (
        <div className="card text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No calendar events.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.slice().sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()).map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{e.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{new Date(e.event_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Tag className="h-4 w-4 inline mr-1 text-gray-400" />{e.event_type || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><FileText className="h-4 w-4 inline mr-1 text-gray-400" />{e.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{events.length} event(s)</p>
        </div>
      )}

      <Modal open={open} title="New Calendar Event" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Foundation Day"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={formEventDate}
                onChange={(e) => setFormEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
              <input
                type="text"
                value={formEventType}
                onChange={(e) => setFormEventType(e.target.value)}
                placeholder="e.g. Holiday"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              placeholder="Event details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}