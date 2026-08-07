"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import api from "@/lib/api";

interface CurriculumRecord {
  id: number;
  name: string;
  description: string | null;
  grade_level: string | null;
  created_at: string;
}

export default function StudentCurriculumPage() {
  const [curriculum, setCurriculum] = useState<CurriculumRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCurriculum() {
      try {
        const res = await api.get("/curriculum/");
        setCurriculum(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load curriculum");
      } finally {
        setLoading(false);
      }
    }

    fetchCurriculum();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading curriculum...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Curriculum</h1>

      {curriculum.length === 0 ? (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No curriculum information available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {curriculum.map((item) => (
            <div key={item.id} className="card">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
              {item.grade_level && (
                <p className="text-xs text-gray-400 mt-1">Grade: {item.grade_level}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}