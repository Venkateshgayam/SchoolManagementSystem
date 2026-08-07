"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";

interface ExamRecord {
  id: number;
  name: string;
  exam_type: string | null;
  start_date: string | null;
  end_date: string | null;
  academic_year: string | null;
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExams() {
      try {
        const res = await api.get("/exams/");
        setExams(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load exams");
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, []);

  const upcomingExams = exams.filter((e) => e.start_date && new Date(e.start_date) >= new Date());
  const completedExams = exams.filter((e) => e.end_date && new Date(e.end_date) < new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading exams...</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Examinations</h1>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary-600" /> Upcoming Exams
        </h2>
        {upcomingExams.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-gray-600">No upcoming exams.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                </div>
                {exam.exam_type && (
                  <p className="text-sm text-gray-500 mb-2">{exam.exam_type}</p>
                )}
                <div className="space-y-1 text-sm text-gray-600">
                  {exam.start_date && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {new Date(exam.start_date).toLocaleDateString()}
                    </p>
                  )}
                  {exam.end_date && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> End: {new Date(exam.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" /> Completed Exams
        </h2>
        {completedExams.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-gray-600">No completed exams.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedExams.map((exam) => (
              <div key={exam.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                </div>
                {exam.exam_type && (
                  <p className="text-sm text-gray-500 mb-2">{exam.exam_type}</p>
                )}
                <div className="space-y-1 text-sm text-gray-600">
                  {exam.start_date && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {new Date(exam.start_date).toLocaleDateString()}
                    </p>
                  )}
                  {exam.end_date && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> End: {new Date(exam.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}