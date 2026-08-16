"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, UserCheck, Copy, Plus, Save, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";
import { useSettings } from "@/hooks/useSettings";

interface ScheduleRecord { id: number; class_id: number; subject_id: number; teacher_id: number | null; room: string | null; day_of_week: number; start_time: string; end_time: string; academic_year: string | null; created_at: string; }
interface ClassRecord { id: number; name: string; section: string | null; }
interface SubjectRecord { id: number; name: string; code: string | null; teacher_ids: number[]; }
interface TeacherRecord { id: number; full_name: string | null; }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formClassId, setFormClassId] = useState<number | "">("");
  const [formSubjectId, setFormSubjectId] = useState<number | "">("");
  const [formTeacherId, setFormTeacherId] = useState<number | "">("");
  const [formRoom, setFormRoom] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  
  const { settings } = useSettings();

  const fetchData = async () => {
    try {
      const [s, c, sub, t] = await Promise.all([
        api.get("/schedules/").catch(() => ({ data: [] })),
        api.get("/classes/").catch(() => ({ data: [] })),
        api.get("/subjects/").catch(() => ({ data: [] })),
        api.get("/teachers/").catch(() => ({ data: [] })),
      ]);
      setSchedules(s.data); setClasses(c.data); setSubjects(sub.data); setTeachers(t.data);
    } catch (err: any) { setError(err?.message || "Failed to load schedules"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const className = (id: number) => { const c = classes.find((cl) => cl.id === id); return c ? `${c.name} ${c.section || ""}`.trim() : `#${id}`; };
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name || `#${id}`;
  const teacherName = (id: number) => teachers.find((t) => t.id === id)?.full_name || `#${id}`;

  const resetForm = () => {
    setFormClassId("");
    setFormSubjectId("");
    setFormTeacherId("");
    setFormRoom("");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (s: ScheduleRecord) => {
    setEditing(s);
    setFormClassId(s.class_id);
    setFormSubjectId(s.subject_id);
    setFormTeacherId(s.teacher_id || "");
    setFormRoom(s.room || "");
    setFormDate(""); // Date is only for creating or overriding the weekday
    setFormStartTime(s.start_time.substring(0, 5));
    setFormEndTime(s.end_time.substring(0, 5));
    setOpen(true);
  };

  const handleSubmit = async () => {
    let dayOfWeekVal = editing ? editing.day_of_week : -1;
    if (formDate) {
      const d = new Date(formDate);
      if (!isNaN(d.getTime())) {
        dayOfWeekVal = (d.getDay() + 6) % 7;
      }
    }
    
    if (formClassId === "" || formSubjectId === "" || (!formDate && !editing) || !formStartTime || !formEndTime) {
      toast.error("Please fill in all required fields (Class, Subject, Date, Start Time, End Time).");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        class_id: Number(formClassId),
        subject_id: Number(formSubjectId),
        teacher_id: formTeacherId !== "" ? Number(formTeacherId) : null,
        room: formRoom || null,
        start_time: formStartTime + ":00",
        end_time: formEndTime + ":00"
      };
      
      if (formDate) {
        payload.date = formDate;
      } else if (editing) {
        payload.day_of_week = editing.day_of_week;
      }

      if (editing) {
        await api.put(`/schedules/${editing.id}`, payload);
      } else {
        await api.post("/schedules/", payload);
      }
      setOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/schedules/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete schedule");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading timetables…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader 
        title="Schedules" 
        subtitle="Manage class timetables across the school" 
        icon={BookOpen} 
        action={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Schedule
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Slots" value={schedules.length} icon={Copy} />
        <StatCard title="Classes Scheduled" value={new Set(schedules.map((s) => s.class_id)).size} icon={BookOpen} />
        <StatCard title="Subjects Covered" value={new Set(schedules.map((s) => s.subject_id)).size} icon={UserCheck} />
      </div>
      {schedules.length === 0 ? (
        <div className="card text-center py-8"><Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No schedules found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.slice().sort((a, b) => a.day_of_week - b.day_of_week || new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{DAYS[s.day_of_week] || `#${s.day_of_week}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{className(s.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{subjectName(s.subject_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Clock className="h-4 w-4 inline mr-1 text-gray-400" />{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.room || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><UserCheck className="h-4 w-4 inline mr-1 text-gray-400" />{s.teacher_id ? teacherName(s.teacher_id) : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-primary-600 mr-3" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(s)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{schedules.length} schedule slot(s)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Schedule" : "New Schedule"} onClose={() => setOpen(false)}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Class *</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.section || ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Subject *</label>
              <select
                value={formSubjectId}
                onChange={(e) => {
                  const newSubjectId = e.target.value === "" ? "" : Number(e.target.value);
                  setFormSubjectId(newSubjectId);
                  if (newSubjectId && formTeacherId) {
                    const newSubject = subjects.find(s => s.id === newSubjectId);
                    if (!newSubject?.teacher_ids?.includes(formTeacherId as number)) {
                      setFormTeacherId("");
                    }
                  } else if (!newSubjectId) {
                    setFormTeacherId("");
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Teacher</label>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
                disabled={!formSubjectId}
              >
                {!formSubjectId ? (
                  <option value="">Select a subject first</option>
                ) : (
                  (() => {
                    const selectedSubject = subjects.find(s => s.id === formSubjectId);
                    const validTeachers = teachers.filter(t => selectedSubject?.teacher_ids?.includes(t.id));
                    if (validTeachers.length === 0) {
                      return <option value="">No teachers assigned to this subject</option>;
                    }
                    return (
                      <>
                        <option value="">Select teacher</option>
                        {validTeachers.map(t => (
                          <option key={t.id} value={t.id}>{t.full_name || `#${t.id}`}</option>
                        ))}
                      </>
                    );
                  })()
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Room</label>
              <input
                type="text"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="e.g. 101"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {editing && <p className="text-xs text-gray-400 mt-1">Leave empty to keep existing day</p>}
            </div>
            
            {/* Display the derived Day (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Day</label>
              <input
                type="text"
                readOnly
                value={(() => {
                  if (formDate) {
                    const [y, m, d] = formDate.split('-');
                    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                    if (!isNaN(dateObj.getTime())) return DAYS[(dateObj.getDay() + 6) % 7];
                  }
                  if (editing) return DAYS[editing.day_of_week];
                  return "Select a date";
                })()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
              />
            </div>
            
            {/* Display the Academic Year (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Academic Year</label>
              <input
                type="text"
                readOnly
                value={editing && editing.academic_year ? editing.academic_year : (settings.current_academic_year || "Loading...")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Start Time *</label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">End Time *</label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
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
        title="Delete Schedule"
        message={`Are you sure you want to delete this schedule slot? This action cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}