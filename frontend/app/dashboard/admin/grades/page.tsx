"use client";

import { useState, useEffect } from "react";
import { BookOpen, BarChart3, Pencil, Plus } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import Modal from "@/components/dashboard/Modal";

interface GradeRecord { id: number; student_id: number; subject_id: number; exam_id: number | null; marks_obtained: number; total_marks: number; percentage: number | null; created_at: string; }
interface StudentRecord { id: number; roll_number: string | null; user_id: number; }
interface SubjectRecord { id: number; name: string; }
interface ExamRecord { id: number; name: string; }

interface GradeForm { student_id: string; subject_id: string; exam_id: string; marks_obtained: string; total_marks: string; }

const EMPTY_FORM: GradeForm = { student_id: "", subject_id: "", exam_id: "", marks_obtained: "", total_marks: "" };

export default function AdminGradesPage() {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GradeRecord | null>(null);
  const [form, setForm] = useState<GradeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [g, s, sub, ex] = await Promise.all([
        api.get("/grades/").catch(() => ({ data: [] })),
        api.get("/students/").catch(() => ({ data: [] })),
        api.get("/subjects/").catch(() => ({ data: [] })),
        api.get("/exams/").catch(() => ({ data: [] })),
      ]);
      setGrades(g.data); setStudents(s.data); setSubjects(sub.data); setExams(ex.data);
    } catch (err: any) { setError(err?.message || "Failed to load grades"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const studentLabel = (id: number) => {
    const s = students.find((st) => st.id === id);
    return s?.roll_number ? `#${s.roll_number}` : `#${id}`;
  };
  const subjectLabel = (id: number) => subjects.find((s) => s.id === id)?.name || `#${id}`;
  const examLabel = (id: number | null) => (id ? exams.find((e) => e.id === id)?.name || `#${id}` : "—");

  const avg = grades.length === 0 ? 0 : grades.reduce((sum, g) => sum + (g.percentage ?? (g.total_marks ? (g.marks_obtained / g.total_marks) * 100 : 0)), 0) / grades.length;

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (g: GradeRecord) => {
    setEditing(g);
    setForm({ student_id: String(g.student_id), subject_id: String(g.subject_id), exam_id: g.exam_id ? String(g.exam_id) : "", marks_obtained: String(g.marks_obtained), total_marks: String(g.total_marks) });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        student_id: Number(form.student_id),
        subject_id: Number(form.subject_id),
        exam_id: form.exam_id ? Number(form.exam_id) : null,
        marks_obtained: Number(form.marks_obtained),
        total_marks: Number(form.total_marks),
      };
      if (editing) {
        await api.put(`/grades/${editing.id}`, { exam_id: payload.exam_id, marks_obtained: payload.marks_obtained, total_marks: payload.total_marks });
      } else {
        await api.post("/grades/", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) { alert(err?.response?.data?.detail || err?.message || "Could not save grade"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading grades…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader
        title="Grades"
        subtitle="View, add and edit student grades"
        icon={BarChart3}
        action={<button onClick={openCreate} className="btn-primary flex items-center gap-1"><Plus className="h-4 w-4" /> Add Grade</button>}
      />
      <div className="card mb-6">
        <StatCard title="Average Across School" value={`${avg.toFixed(2)}%`} icon={BarChart3} trend={`${grades.length} grade(s)`} />
      </div>
      {grades.length === 0 ? (
        <div className="card text-center py-8"><BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No grades found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((g) => (
                  <tr key={g.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{studentLabel(g.student_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{subjectLabel(g.subject_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{examLabel(g.exam_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{g.marks_obtained} / {g.total_marks}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{g.percentage ?? "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(g.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right"><button onClick={() => openEdit(g)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{grades.length} grade(s)</p>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? `Edit Grade #${editing.id}` : "Add Grade"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required disabled={!!editing} className="input">
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>#{s.roll_number || s.id}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required disabled={!!editing} className="input">
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam (optional)</label>
            <select value={form.exam_id} onChange={(e) => setForm({ ...form, exam_id: e.target.value })} className="input">
              <option value="">None</option>
              {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marks Obtained</label>
              <input type="number" step="any" min={0} value={form.marks_obtained} onChange={(e) => setForm({ ...form, marks_obtained: e.target.value })} required className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
              <input type="number" step="any" min={0} value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: e.target.value })} required className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : editing ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}