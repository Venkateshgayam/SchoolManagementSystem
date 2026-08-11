"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Clock, CheckCircle, Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
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
  const [submitFile, setSubmitFile] = useState<Record<number, File | null>>({});
  const [previewUrl, setPreviewUrl] = useState<Record<number, string | null>>({});

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

  const handleFileChange = (assignmentId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      setSubmitFile((prev) => ({ ...prev, [assignmentId]: file }));
      
      if (file.type.startsWith("image/")) {
        setPreviewUrl((prev) => ({ ...prev, [assignmentId]: URL.createObjectURL(file) }));
      } else {
        setPreviewUrl((prev) => ({ ...prev, [assignmentId]: null }));
      }
    }
  };

  const removeFile = (assignmentId: number) => {
    setSubmitFile((prev) => ({ ...prev, [assignmentId]: null }));
    setPreviewUrl((prev) => ({ ...prev, [assignmentId]: null }));
  };

  const handleSubmit = async (assignmentId: number) => {
    setSubmittingId(assignmentId);
    try {
      const formData = new FormData();
      formData.append("assignment_id", assignmentId.toString());
      if (submitText[assignmentId]) {
        formData.append("submission_text", submitText[assignmentId]);
      }
      if (submitFile[assignmentId]) {
        formData.append("file", submitFile[assignmentId] as Blob);
      }

      await api.post("/assignment-submissions/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const res = await api.get("/assignment-submissions");
      setSubmissions(res.data);
      setSubmitText((prev) => ({ ...prev, [assignmentId]: "" }));
      setSubmitFile((prev) => ({ ...prev, [assignmentId]: null }));
      setPreviewUrl((prev) => ({ ...prev, [assignmentId]: null }));
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
              <div className="mt-4 border-t border-gray-100 pt-4">
                <textarea
                  value={submitText[assignment.id] || ""}
                  onChange={(e) => setSubmitText((prev) => ({ ...prev, [assignment.id]: e.target.value }))}
                  placeholder="Enter your submission (optional if attaching a file)..."
                  className="input-field w-full mb-3"
                  rows={3}
                />
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 transition-colors text-sm font-medium">
                    <Paperclip className="h-4 w-4" />
                    Attach File
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={(e) => handleFileChange(assignment.id, e)}
                    />
                  </label>
                  <span className="text-xs text-gray-400">Max 10MB (PDF, Word, Images)</span>
                </div>

                {submitFile[assignment.id] && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {previewUrl[assignment.id] ? (
                        <img src={previewUrl[assignment.id]!} alt="Preview" className="h-10 w-10 object-cover rounded" />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                          <FileText className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div className="truncate text-sm font-medium text-gray-700">
                        {submitFile[assignment.id]?.name}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(assignment.id)}
                      className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-200 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
                        <span className="text-sm text-gray-500">· Marks: {submission.grade}</span>
                      )}
                    </div>
                  </div>
                </div>
                {submission?.attachment_url && (
                  <div className="mt-4 border-t border-gray-100 pt-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${submission.attachment_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                    >
                      View Attached File
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}