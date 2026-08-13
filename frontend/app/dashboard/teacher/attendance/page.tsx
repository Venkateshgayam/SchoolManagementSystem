"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import { Calendar, Users, Save, ClipboardList } from "lucide-react";
import api from "@/lib/api";

interface TeacherInfo {
  id: number;
  user_id: number;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
  teacher_id: number | null;
}

interface StudentInfo {
  id: number;
  roll_number: string | null;
  class_id: number | null;
  status: string;
  full_name?: string;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: string;
  marked_by: number | null;
  created_at: string;
}

export default function TeacherAttendancePage() {
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [teacherRes, classesRes, studentsRes, attendanceRes] = await Promise.all([
          api.get("/teachers/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
          api.get("/students/").catch(() => ({ data: [] })),
          api.get("/attendance/").catch(() => ({ data: [] })),
        ]);

        setTeacher(teacherRes.data);
        setClasses(classesRes.data);
        setStudents(studentsRes.data);
        setAttendance(attendanceRes.data);

        const today = new Date().toLocaleDateString('en-CA');
        setSelectedDate(today);
      } catch (err: any) {
        setError(err?.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const teacherClasses = classes.filter((c) => c.teacher_id === teacher?.id);

  const classStudents = selectedClassId
    ? students.filter((s) => s.class_id === selectedClassId)
    : [];

  const classAttendance = selectedClassId
    ? attendance.filter((a) => a.class_id === selectedClassId)
    : [];

  const handleStatusChange = (studentId: number, value: string) => {
    setStatuses((prev) => ({ ...prev, [studentId]: value }));
  };

  const saveAttendance = async () => {
    if (!selectedClassId || !teacher) return;

    const entries = classStudents
      .map((s) => ({ student_id: s.id, status: statuses[s.id] || "present" }))
      .filter((e) => e.status);

    if (entries.length === 0) return;

    setSaving(true);
    setMessage(null);
    try {
      for (const entry of entries) {
        const existing = classAttendance.find(
          (a) => a.student_id === entry.student_id && a.date === selectedDate
        );
        if (existing) {
          await api.put(`/attendance/${existing.id}`, {
            status: entry.status,
            marked_by: teacher.user_id,
          });
        } else {
          await api.post("/attendance/", {
            student_id: entry.student_id,
            class_id: selectedClassId,
            date: selectedDate,
            status: entry.status,
            marked_by: teacher.user_id,
          });
        }
      }
      setMessage(`Attendance saved for ${entries.length} student(s).`);
      const res = await api.get("/attendance/");
      setAttendance(res.data);
      setStatuses({});
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading attendance...</div>
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

  if (!teacher) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600">Teacher profile not available.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mark Attendance</h1>

      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => {
                setSelectedClassId(e.target.value ? Number(e.target.value) : null);
                setStatuses({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>
                Select a class
              </option>
              {teacherClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section || ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <button
              onClick={saveAttendance}
              disabled={!selectedClassId || saving || classStudents.length === 0}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`card mb-6 ${
            message.includes("Failed") ? "border-danger-200 bg-danger-50" : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-sm ${
              message.includes("Failed") ? "text-danger-600" : "text-green-800"
            }`}
          >
            {message}
          </p>
        </div>
      )}

      {!selectedClassId ? (
        <div className="card text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Select a class to mark attendance.</p>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600">No students found in this class.</p>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {classes.find((c) => c.id === selectedClassId)
              ? `${classes.find((c) => c.id === selectedClassId)!.name} ${
                  classes.find((c) => c.id === selectedClassId)!.section || ""
                }`.trim()
              : "Class"}
            <span className="text-sm font-normal text-gray-500 ml-2">({selectedDate})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classStudents.map((s) => {
                  const existing = classAttendance.find(
                    (a) => a.student_id === s.id && a.date === selectedDate
                  );
                  const defaultStatus = existing ? existing.status : "present";
                  const status = statuses[s.id] ?? defaultStatus;
                  return (
                    <tr key={s.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{s.full_name || `Student #${s.id}`}</div>
                        <div className="text-xs text-gray-500">Roll No: {s.roll_number || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {existing ? new Date(existing.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Records</h2>
        {classAttendance.length === 0 ? (
          <p className="text-gray-600">No attendance records for this class.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {classAttendance
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      {students.find(s => s.id === a.student_id)?.full_name || `Student #${a.student_id}`} — {formatDate(a.date)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      a.status === "present"
                        ? "bg-green-100 text-green-800"
                        : a.status === "absent"
                        ? "bg-red-100 text-red-800"
                        : a.status === "late"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
