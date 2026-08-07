"use client";

import { useState, useEffect } from "react";
import { Calendar, Tag, FileText } from "lucide-react";
import api from "@/lib/api";

interface CalendarEvent { id: number; title: string; description: string | null; event_date: string; event_type: string | null; created_at: string; }

export default function ManagementAcademicCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/academic-calendar/").then((res) => setEvents(res.data)).catch((err) => setError(err?.message || "Failed to load calendar events")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading academic calendar…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Academic Calendar</h1>
      {events.length === 0 ? (
        <div className="card text-center py-8"><Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No calendar events.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr></thead>
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
    </div>
  );
}
