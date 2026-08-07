"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Clock, CheckCircle, Send } from "lucide-react";
import api from "@/lib/api";

interface AssignmentRecord {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  class_id: number | null;
  teacher_id: number | null;
  due_date: string | null;
  attachment_url: string | null;
  created_at: string;
}

interface SubmissionRecord {
  id: number;
  assignment_id: number;
  student_id: number;
  submission_text: string | null;
  attachment_url: string | null;
  submitted_at: string;
  grade: number | null;
}

interface SubjectInfo {
  id: number;
  name: string;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [submitText, setSubmitText] = useState<Record<number, string>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [assignmentsRes, studentRes, submissionsRes, subjectsRes] = await Promise.all([
          api.get("/assignments/").catch(() => ({ data: [] })),
          api.get("/students/me").catch(() => ({ data: null })),
          api.get("/assignment-submissions").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] })),
        ]);

        const student = studentRes.data;
        const filteredAssignments = assignmentsRes.data.filter(
          (a: AssignmentRecord) => a.class_id === student?.class_id
        );
        setAssignments(filteredAssignments);
        setSubmissions(submissionsRes.data);
        setSubjects(subjectsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getSubjectName = (subjectId: number | null) => {
    if (!subjectId) return "N/A";
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || `Subject ${subjectId}`;
  };

  const getSubmission = (assignmentId: number) => {
    return submissions.find(
      (s) => s.assignment_id === assignmentId && s.student_id === submissions[0]?.student_id
    );
  };

  const handleSubmit = async (assignmentId: number) => {
    setSubmittingId(assignmentId);
    try {
      await api.post("/assignment-submissions", {
        assignment_id: assignmentId,
        submission_text: submitText[assignmentId] || "",
      });
      const res = await api.get("/assignment-submissions");
      setSubmissions(res.data);
      setSubmitText((prev) => ({ ...prev, [assignmentId]: "" }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit assignment");
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading assignments...</div>
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

  const pendingAssignments = assignments.filter((a) => {
    const submission = submissions.find((s) => s.assignment_id === a.id);
    return !submission;
  });

  const submittedAssignments = assignments.filter((a) => {
    const submission = submissions.find((s) => s.assignment_id === a.id);
    return submission;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Assignments</h1>

      {assignments.length === 0 ? (
        <div className="card text-center py-8">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No assignments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingAssignments.map((assignment) => (
            <div key={assignment.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {getSubjectName(assignment.subject_id)}
                  </p>
                  {assignment.due_date && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4" /> Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleSubmit(assignment.id)}
                  disabled={submittingId === assignment.id}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {submittingId === assignment.id ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit
                    </>
                  )}
                </button>
              </div>
              {assignment.description && (
                <p className="mt-3 text-sm text-gray-600">{assignment.description}</p>
              )}
              <div className="mt-3">
                <textarea
                  value={submitText[assignment.id] || ""}
                  onChange={(e) => setSubmitText((prev) => ({ ...prev, [assignment.id]: e.target.value }))}
                  placeholder="Enter your submission..."
                  className="input-field w-full"
                  rows={3}
                />
              </div>
            </div>
          ))}

          {submittedAssignments.map((assignment) => {
            const submission = submissions.find((s) => s.assignment_id === assignment.id);
            return (
              <div key={assignment.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {getSubjectName(assignment.subject_id)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Submitted</span>
                      {submission?.grade !== null && submission?.grade !== undefined && (
                        <span className="text-sm text-gray-500">· Grade: {submission.grade}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}