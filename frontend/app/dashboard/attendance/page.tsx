"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Calendar, BookOpen, Users, Plus, Save } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Modal from "@/components/dashboard/Modal";
import toast from "react-hot-toast";
import { can } from "@/lib/permissions";

interface AttendanceRecord { id: number; student_id: number; class_id: number; date: string; status: string; marked_by: number | null; created_at: string; }
interface ClassRecord { id: number; name: string; section: string | null; }
interface StudentRecord { id: number; roll_number: string | null; class_id: number | null; }

const STATUS_OPTIONS = ["present", "absent", "late"];

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = can("attendance:create");

  // Add record modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ student_id: "", class_id: "", date: new Date().toISOString().split("T")[0], status: "present" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [a, c, s] = await Promise.all([
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
        ]);
        setAttendance(a.data); setClasses(c.data); setStudents(s.data);
      } catch (err: any) { setError(err?.message || "Failed to load attendance"); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  const className = (classId: number) => {
    const c = classes.find((cl) => cl.id === classId);
    return c ? `${c.name} ${c.section || ""}`.trim() : `#${classId}`;
  };
  const studentLabel = (studentId: number) => {
    const s = students.find((st) => st.id === studentId);
    return s?.roll_number ? `#${s.roll_number}` : `#${studentId}`;
  };

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const rate = attendance.length === 0 ? 0 : (presentCount / attendance.length) * 100;
  const absentCount = attendance.filter((a) => a.status === "absent").length;

  const handleAddRecord = async () => {
    if (!addForm.student_id || !addForm.class_id || !addForm.date || !addForm.status) {
      toast.error("All fields are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        student_id: Number(addForm.student_id),
        class_id: Number(addForm.class_id),
        date: addForm.date,
        status: addForm.status,
        marked_by: null,
      };
      await api.post("/attendance/", body);
      toast.success("Attendance record added.");
      setAddOpen(false);
      setAddForm({ student_id: "", class_id: "", date: new Date().toISOString().split("T")[0], status: "present" });
      const res = await api.get("/attendance/");
      setAttendance(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to add attendance record.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading attendance…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Attendance records"
        icon={ClipboardList}
        action={
          canCreate ? (
            <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Record
            </button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Records" value={attendance.length} icon={ClipboardList} />
        <StatCard title="Attendance Rate" value={`${rate.toFixed(1)}%`} icon={Calendar} trend={`${presentCount} present`} />
        <StatCard title="Absences" value={absentCount} icon={Users} />
      </div>
      {!canCreate && (
        <div className="card mb-6 text-sm text-gray-600">
          You have read-only access to attendance records.
        </div>
      )}
      {attendance.length === 0 ? (
        <div className="card text-center py-8"><ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No attendance records.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Users className="h-4 w-4 inline mr-1 text-gray-400" />{studentLabel(r.student_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><BookOpen className="h-4 w-4 inline mr-1 text-gray-400" />{className(r.class_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{attendance.length} record(s)</p>
        </div>
      )}

      <Modal open={addOpen} title="Add Attendance Record" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Student</label>
            <select value={addForm.student_id} onChange={(e) => setAddForm({ ...addForm, student_id: e.target.value })} className="input w-full">
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.roll_number ? `#${s.roll_number}` : `Student #${s.id}`}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select value={addForm.class_id} onChange={(e) => setAddForm({ ...addForm, class_id: e.target.value })} className="input w-full">
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ""}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} className="input w-full" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })} className="input w-full">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setAddOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleAddRecord} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}