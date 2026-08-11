"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Calendar, Clock, CheckCircle, Send, Paperclip, X, FileText, XCircle } from "lucide-react";
import api from "@/lib/api";

interface ExamSubjectSlot {
  id: number;
  subject_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface ExamRecord {
  id: number;
  name: string;
  exam_type: string | null;
  academic_year: string | null;
  slots: ExamSubjectSlot[];
}

interface Subject {
  id: number;
  name: string;
}

interface ExamSubmission {
  id: number;
  exam_subject_slot_id: number;
  student_id: number;
  submission_text: string | null;
  attachment_url: string | null;
  submitted_at: string;
  grade: number | null;
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // slot ID -> state
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [submitText, setSubmitText] = useState<Record<number, string>>({});
  const [submitFile, setSubmitFile] = useState<Record<number, File | null>>({});
  const [previewUrl, setPreviewUrl] = useState<Record<number, string | null>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [examsRes, subsRes, subjsRes] = await Promise.all([
          api.get("/exams/"),
          api.get("/exam-submissions").catch(() => ({ data: [] })),
          api.get("/subjects/").catch(() => ({ data: [] }))
        ]);
        setExams(examsRes.data);
        setSubmissions(subsRes.data);
        setSubjects(subjsRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load exams");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || `Subject ${id}`;
  
  const getSubmission = (slotId: number) => submissions.find(s => s.exam_subject_slot_id === slotId);

  const handleFileChange = (slotId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      setSubmitFile((prev) => ({ ...prev, [slotId]: file }));
      
      if (file.type.startsWith("image/")) {
        setPreviewUrl((prev) => ({ ...prev, [slotId]: URL.createObjectURL(file) }));
      } else {
        setPreviewUrl((prev) => ({ ...prev, [slotId]: null }));
      }
    }
  };

  const removeFile = (slotId: number) => {
    setSubmitFile((prev) => ({ ...prev, [slotId]: null }));
    setPreviewUrl((prev) => ({ ...prev, [slotId]: null }));
  };

  const handleSubmit = async (slotId: number) => {
    setSubmittingId(slotId);
    try {
      const formData = new FormData();
      formData.append("exam_subject_slot_id", slotId.toString());
      if (submitText[slotId]) {
        formData.append("submission_text", submitText[slotId]);
      }
      if (submitFile[slotId]) {
        formData.append("file", submitFile[slotId] as Blob);
      }

      await api.post("/exam-submissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const res = await api.get("/exam-submissions");
      setSubmissions(res.data);
      setSubmitText((prev) => ({ ...prev, [slotId]: "" }));
      setSubmitFile((prev) => ({ ...prev, [slotId]: null }));
      setPreviewUrl((prev) => ({ ...prev, [slotId]: null }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit exam");
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading exams...</div></div>;
  if (error) return <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>;

  // Flatten slots with their parent exam details
  const allSlots = exams.flatMap(exam => 
    (exam.slots || []).map(slot => ({ ...slot, exam }))
  );

  const upcomingSlots = allSlots.filter(s => {
    const sub = getSubmission(s.id);
    if (sub) return false;
    const isPast = new Date() > new Date(s.end_time + "Z");
    return !isPast;
  });

  const completedOrMissedSlots = allSlots.filter(s => {
    const sub = getSubmission(s.id);
    if (sub) return true;
    const isPast = new Date() > new Date(s.end_time + "Z");
    return isPast;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Examinations</h1>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary-600" /> Upcoming Exams
        </h2>
        {upcomingSlots.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-gray-600">No upcoming exams.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingSlots.map((slot) => {
              return (
                <div key={slot.id} className="card border border-primary-100 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-5 w-5 text-primary-600" />
                        <h3 className="font-bold text-gray-900">{slot.exam.name} - {getSubjectName(slot.subject_id)}</h3>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{slot.exam.exam_type || "General"} | {slot.exam.academic_year}</p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="flex items-center gap-2 text-gray-700 font-medium">
                          <Calendar className="h-4 w-4 text-gray-400" /> {new Date(slot.date).toLocaleDateString()}
                        </p>
                        <p className="flex items-center gap-2 text-gray-700 font-medium">
                          <Clock className="h-4 w-4 text-gray-400" /> 
                          {new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                          {new Date(slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-gray-200">
                    {new Date() < new Date(slot.start_time + "Z") ? (
                      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm font-medium border border-yellow-200">
                        This exam opens at {new Date(slot.start_time + "Z").toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} on {new Date(slot.start_time + "Z").toLocaleDateString()}.
                      </div>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Submission
                        </label>
                        <textarea
                          value={submitText[slot.id] || ""}
                          onChange={(e) => setSubmitText((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                          placeholder="Enter your exam submission text (optional if attaching a file)..."
                          className="input-field w-full mb-3"
                          rows={3}
                        />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 transition-colors text-sm font-medium">
                              <Paperclip className="h-4 w-4" />
                              Attach File
                              <input
                                type="file"
                                className="hidden"
                                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                onChange={(e) => handleFileChange(slot.id, e)}
                              />
                            </label>
                            <span className="text-xs text-gray-400 hidden sm:inline">Max 10MB (PDF, Word, Images)</span>
                          </div>
                          
                          <button
                            onClick={() => handleSubmit(slot.id)}
                            disabled={submittingId === slot.id}
                            className="btn-primary text-sm flex items-center gap-2"
                          >
                            {submittingId === slot.id ? "Submitting..." : <><Send className="h-4 w-4" /> Submit</>}
                          </button>
                        </div>

                        {submitFile[slot.id] && (
                          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-between max-w-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              {previewUrl[slot.id] ? (
                                <img src={previewUrl[slot.id]!} alt="Preview" className="h-8 w-8 object-cover rounded" />
                              ) : (
                                <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                              <div className="truncate text-sm font-medium text-gray-700">
                                {submitFile[slot.id]?.name}
                              </div>
                            </div>
                            <button onClick={() => removeFile(slot.id)} className="p-1 text-gray-500 hover:text-red-500" title="Remove file">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-gray-500" /> Past & Completed Exams
        </h2>
        {completedOrMissedSlots.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-gray-600">No past exams.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedOrMissedSlots.map((slot) => {
              const submission = getSubmission(slot.id);
              const isMissed = !submission;

              return (
                <div key={slot.id} className="card bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isMissed ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        <h3 className={`font-bold ${isMissed ? 'text-gray-600' : 'text-gray-900'}`}>{slot.exam.name} - {getSubjectName(slot.subject_id)}</h3>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(slot.date).toLocaleDateString()} | {new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div>
                      {isMissed ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Missed Deadline
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Submitted
                          </span>
                          {submission.grade !== null && submission.grade !== undefined && (
                            <span className="text-sm font-bold text-gray-700">Marks: {submission.grade}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {submission && (submission.submission_text || submission.attachment_url) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {submission.submission_text && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Your submission:</p>
                          <p className="text-sm text-gray-700 bg-white rounded border border-gray-200 p-2">{submission.submission_text}</p>
                        </div>
                      )}
                      {submission.attachment_url && (
                        <div className="mt-2 flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${submission.attachment_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1"
                          >
                            View Attached File
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}