"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import api from "@/lib/api";

interface SubjectInfo {
  id: number;
  name: string;
}

export default function StudentSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await api.get("/subjects/");
        setSubjects(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load subjects");
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading subjects...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subjects</h1>

      {subjects.length === 0 ? (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No subjects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div key={subject.id} className="card flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <h3 className="font-semibold text-gray-900">{subject.name}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}