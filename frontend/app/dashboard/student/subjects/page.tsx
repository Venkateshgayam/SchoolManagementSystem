"use client";

import { useState, useEffect } from "react";
import { BookOpen, User, Mail, Phone, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";

interface SubjectInfo {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  teacher_id: number | null;
}

interface TeacherInfo {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  qualification: string | null;
}

export default function StudentSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [teachers, setTeachers] = useState<Record<number, TeacherInfo>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [subjectsRes, teachersRes] = await Promise.all([
          api.get("/subjects/"),
          api.get("/teachers/").catch(() => ({ data: [] })),
        ]);
        setSubjects(subjectsRes.data);
        // Build teacher lookup by id
        const lookup: Record<number, TeacherInfo> = {};
        for (const t of teachersRes.data) {
          lookup[t.id] = t;
        }
        setTeachers(lookup);
      } catch (err: any) {
        setError(err?.message || "Failed to load subjects");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
          {subjects.map((subject) => {
            const teacher = subject.teacher_id ? teachers[subject.teacher_id] : null;
            const isExpanded = expandedId === subject.id;

            return (
              <div
                key={subject.id}
                className="card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => toggleExpand(subject.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-primary-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      {subject.code && (
                        <p className="text-xs text-gray-500">{subject.code}</p>
                      )}
                    </div>
                  </div>
                  {teacher ? (
                    isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )
                  ) : null}
                </div>

                {subject.description && (
                  <p className="mt-2 text-sm text-gray-600">{subject.description}</p>
                )}

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {teacher ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase">Assigned Teacher</p>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {teacher.full_name || "Unknown"}
                          </span>
                        </div>
                        {teacher.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <a
                              href={`mailto:${teacher.email}`}
                              className="text-sm text-primary-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {teacher.email}
                            </a>
                          </div>
                        )}
                        {teacher.qualification && (
                          <p className="text-xs text-gray-500">
                            Qualification: {teacher.qualification}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No teacher assigned yet.</p>
                    )}
                  </div>
                )}

                {!isExpanded && teacher && (
                  <p className="mt-2 text-xs text-gray-500">
                    Teacher: {teacher.full_name || "Assigned"}
                    <span className="ml-1 text-primary-500">· Click for details</span>
                  </p>
                )}
                {!isExpanded && !teacher && (
                  <p className="mt-2 text-xs text-gray-400 italic">No teacher assigned</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}