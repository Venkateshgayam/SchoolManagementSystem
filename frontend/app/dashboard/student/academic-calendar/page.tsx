"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import api from "@/lib/api";

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string | null;
  created_at: string;
}

export default function StudentAcademicCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await api.get("/academic-calendar/");
        setEvents(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load calendar");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading calendar...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Academic Calendar</h1>

      {events.length === 0 ? (
        <div className="card text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No calendar events found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events
            .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
            .map((event) => (
              <div key={event.id} className="card flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {event.event_date && new Date(event.event_date).toLocaleDateString()}
                    {event.event_type && ` · ${event.event_type}`}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}