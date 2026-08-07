"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Save, Calendar, Tag, Award } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";

interface ExamRecord {
  id: number;
  name: string;
  exam_type: string | null;
  start_date: string | null;
  end_date: string | null;
  academic_year: string | null;
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formExamType, setFormExamType] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formAcademicYear, setFormAcademicYear] = useState("");

  const fetchExams = async () => {
    const res = await api.get("/exams/");
    setExams(res.data);
  };

  useEffect(() => {
    api.get("/exams/")
      .then((res) => setExams(res.data))
      .catch((err: any) => setError(err?.message || "Failed to load exams"))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormExamType("");
    setFormStartDate("");
    setFormEndDate("");
    setFormAcademicYear("");
  };

  const handleCreate = async () => {
    if (!formName) {
      alert("Exam name is required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/exams/", {
        name: formName,
        exam_type: formExamType || null,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        academic_year: formAcademicYear || null,
      });
      setOpen(false);
      resetForm();
      await fetchExams();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading exams…</div></div>;
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
        title="Exams"
        subtitle="Manage examination schedules"
        icon={FileText}
        action={
          <button onClick={() => { resetForm(); setOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Exam
          </button>
        }
      />

      {exams.length === 0 ? (
        <div className="card text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No exams found.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.slice().sort((a, b) => (b.start_date || "").localeCompare(a.start_date || "")).map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Tag className="h-4 w-4 inline mr-1 text-gray-400" />{e.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.exam_type || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{e.start_date ? new Date(e.start_date).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.end_date ? new Date(e.end_date).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Award className="h-4 w-4 inline mr-1 text-gray-400" />{e.academic_year || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{exams.length} exam(s)</p>
        </div>
      )}

      <Modal open={open} title="New Exam" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Midterm Examination"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Exam Type</label>
            <input
              type="text"
              value={formExamType}
              onChange={(e) => setFormExamType(e.target.value)}
              placeholder="e.g. Final"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Academic Year</label>
            <input
              type="text"
              value={formAcademicYear}
              onChange={(e) => setFormAcademicYear(e.target.value)}
              placeholder="e.g. 2025-2026"
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