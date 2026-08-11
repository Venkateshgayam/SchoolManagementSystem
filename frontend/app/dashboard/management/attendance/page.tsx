"use client";

import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Calendar, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface AttendanceRecord {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: string;
  marked_by: number | null;
  created_at: string;
}

interface StudentRecord {
  id: number;
  roll_number: string | null;
  class_id: number | null;
  full_name?: string;
}

interface ClassRecord {
  id: number;
  name: string;
  section: string | null;
}

const STATUS_OPTIONS = ["present", "absent", "late"];

export default function ManagementAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [attendanceRes, studentsRes, classesRes] = await Promise.all([
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/classes/").catch(() => ({ data: [] })),
        ]);
        setAttendance(attendanceRes.data);
        setStudents(studentsRes.data);
        setClasses(classesRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const classOptions = classes;

  const filteredStudents = useMemo(
    () => selectedClassId ? students.filter((s) => s.class_id === selectedClassId) : [],
    [students, selectedClassId]
  );

  const existingRecords = useMemo(
    () => attendance.filter((a) => a.class_id === selectedClassId && a.date === selectedDate),
    [attendance, selectedClassId, selectedDate]
  );

  useEffect(() => {
    const nextStatusMap: Record<number, string> = {};
    existingRecords.forEach((record) => {
      nextStatusMap[record.student_id] = record.status;
    });
    setStatusMap(nextStatusMap);
  }, [existingRecords]);

  const handleStatusChange = (studentId: number, value: string) => {
    setStatusMap((prev) => ({ ...prev, [studentId]: value }));
  };

  const getClassName = (classId: number | null) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? `${cls.name} ${cls.section || ""}`.trim() : `Class #${classId}`;
  };

  const attendanceRate = attendance.length === 0 ? 0 :
    (attendance.filter((a) => a.status === "present").length / attendance.length) * 100;

  const handleSave = async () => {
    if (!selectedClassId) {
      toast.error("Select a class before saving attendance.");
      return;
    }
    if (!selectedDate) {
      toast.error("Select a date for attendance.");
      return;
    }

    const entries = filteredStudents
      .map((student) => ({
        student_id: student.id,
        class_id: selectedClassId,
        date: selectedDate,
        status: statusMap[student.id],
      }))
      .filter((entry) => entry.status && STATUS_OPTIONS.includes(entry.status));

    if (entries.length === 0) {
      toast.error("Choose attendance statuses for at least one student.");
      return;
    }

    setSaving(true);
    try {
      for (const entry of entries) {
        const existing = attendance.find(
          (record) => record.student_id === entry.student_id && record.class_id === entry.class_id && record.date === entry.date
        );
        if (existing) {
          await api.put(`/attendance/${existing.id}`, {
            status: entry.status,
            marked_by: null,
          });
        } else {
          await api.post("/attendance/", {
            student_id: entry.student_id,
            class_id: entry.class_id,
            date: entry.date,
            status: entry.status,
            marked_by: null,
          });
        }
      }
      const refreshed = await api.get("/attendance/");
      setAttendance(refreshed.data);
      toast.success("Attendance saved successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading attendance…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance</h1>
      <div className="card mb-6">
        <p className="text-sm text-gray-600">
          School-wide attendance rate: <span className="font-bold text-gray-900">{attendanceRate.toFixed(1)}%</span>
        </p>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Class</label>
            <select
              className="input w-full"
              value={selectedClassId ?? ""}
              onChange={(e) => {
                setSelectedClassId(e.target.value ? Number(e.target.value) : null);
                setStatusMap({});
              }}
            >
              <option value="">Select class</option>
              {classOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section || ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input w-full"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSave}
              disabled={saving || !selectedClassId}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>

      {selectedClassId === null ? (
        <div className="card text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Select a class to add or correct attendance records.</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No students assigned to this class.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const currentStatus = statusMap[student.id] ?? existingRecords.find((record) => record.student_id === student.id)?.status ?? "";
                  return (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{student.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.roll_number || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          className="input w-40"
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(student.id, e.target.value)}
                        >
                          <option value="">Select status</option>
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">Updating attendance for <span className="font-semibold">{filteredStudents.length}</span> student(s) on <span className="font-semibold">{selectedDate}</span>.</p>
        </div>
      )}
    </div>
  );
}
