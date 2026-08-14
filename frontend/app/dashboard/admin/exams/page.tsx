"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Save, Calendar, Tag, Award, Pencil, Trash2, X, PlusCircle } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";

interface ExamSubjectSlot {
  id?: number;
  subject_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface ExamRecord {
  id: number;
  name: string;
  academic_year: string | null;
  total_marks: number | null;
  slots: ExamSubjectSlot[];
}

interface Subject {
  id: number;
  name: string;
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formAcademicYear, setFormAcademicYear] = useState("");
  const [formTotalMarks, setFormTotalMarks] = useState("");
  const [formSlots, setFormSlots] = useState<Partial<ExamSubjectSlot>[]>([]);
  
  const isPast = (slots: ExamSubjectSlot[]) => slots.length > 0 && slots.some(s => new Date(s.start_time) < new Date());

  const fetchData = async () => {
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        api.get("/exams/"),
        api.get("/subjects/")
      ]);
      setExams(examsRes.data);
      setSubjects(subjectsRes.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormAcademicYear("");
    setFormTotalMarks("");
    setFormSlots([]);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (e: ExamRecord) => {
    setEditing(e);
    setFormName(e.name);
    setFormAcademicYear(e.academic_year || "");
    setFormTotalMarks(e.total_marks ? String(e.total_marks) : "");
    setFormSlots(e.slots.map(s => {
      const dDate = new Date(s.date);
      const dStart = new Date(s.start_time);
      const dEnd = new Date(s.end_time);
      return {
        id: s.id,
        subject_id: s.subject_id,
        date: dDate.toLocaleDateString('en-CA'),
        start_time: dStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        end_time: dEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    }));
    setOpen(true);
  };

  const handleAddSlot = () => {
    setFormSlots([...formSlots, { subject_id: 0, date: "", start_time: "", end_time: "" }]);
  };

  const handleRemoveSlot = (index: number) => {
    setFormSlots(formSlots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof ExamSubjectSlot, value: any) => {
    const updated = [...formSlots];
    updated[index] = { ...updated[index], [field]: value };
    setFormSlots(updated);
  };

  const handleSubmit = async () => {
    if (!formName) {
      toast.error("Exam name is required.");
      return;
    }
    
    // Validate slots
    for (const slot of formSlots) {
      if (!slot.subject_id || !slot.date || !slot.start_time || !slot.end_time) {
        toast.error("Please fill all fields for all subject slots.");
        return;
      }
    }

    setSaving(true);
    try {
      const slotsPayload = formSlots.map(s => {
        const start = new Date(`${s.date}T${s.start_time}:00`);
        const end = new Date(`${s.date}T${s.end_time}:00`);
        const dateOnly = new Date(`${s.date}T00:00:00`);
        
        return {
          subject_id: Number(s.subject_id),
          date: dateOnly.toISOString(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        };
      });

      const payload = {
        name: formName,
        academic_year: formAcademicYear || null,
        total_marks: formTotalMarks ? Number(formTotalMarks) : null,
        slots: slotsPayload
      };

      if (editing) {
        await api.put(`/exams/${editing.id}`, payload);
      } else {
        await api.post("/exams/", payload);
      }
      setOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/exams/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete exam");
    } finally {
      setDeleting(false);
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
        subtitle="Manage multi-subject examinations"
        icon={FileText}
        action={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Tag className="h-4 w-4 inline mr-1 text-gray-400" />{e.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {e.slots.length} Subjects
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Award className="h-4 w-4 inline mr-1 text-gray-400" />{e.academic_year || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => !isPast(e.slots) && openEdit(e)}
                        className={`text-gray-500 hover:text-primary-600 mr-3 ${isPast(e.slots) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPast(e.slots) ? "Cannot edit — exam date has passed or started" : "Edit"}
                        disabled={isPast(e.slots)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(e)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{exams.length} exam(s)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Exam" : "New Exam"} onClose={() => setOpen(false)}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Final Examination"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total Marks</label>
              <input
                type="number"
                value={formTotalMarks}
                onChange={(e) => setFormTotalMarks(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Subject Slots</h4>
              <button onClick={handleAddSlot} className="text-primary-600 hover:text-primary-800 text-sm flex items-center gap-1 font-medium">
                <PlusCircle className="h-4 w-4" /> Add Subject
              </button>
            </div>
            
            {formSlots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No subjects added to this exam yet.
              </p>
            ) : (
              <div className="space-y-3">
                {formSlots.map((slot, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="w-full sm:w-1/3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                      <select
                        value={slot.subject_id || ""}
                        onChange={(e) => updateSlot(index, "subject_id", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="">Select subject</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-1/4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={slot.date || ""}
                        onChange={(e) => updateSlot(index, "date", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div className="w-full sm:w-1/5">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                      <input
                        type="time"
                        value={slot.start_time || ""}
                        onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div className="w-full sm:w-1/5">
                      <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                      <input
                        type="time"
                        value={slot.end_time || ""}
                        onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveSlot(index)}
                      className="text-gray-400 hover:text-red-500 p-1.5"
                      title="Remove Slot"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-6 border-t border-gray-100">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : (editing ? "Update" : "Create")}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Exam"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This will also remove any student submissions associated with it. This action cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}