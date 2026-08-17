"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect, useMemo } from "react";
import { Calendar, Users, Save, ClipboardList, History } from "lucide-react";
import api from "@/lib/api";
import { calculateAttendanceStats } from "@/lib/attendanceCalculations";
import AttendanceRecordsList from "@/components/dashboard/AttendanceRecordsList";

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

  // Month filter for review (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toLocaleDateString("en-CA").slice(0, 7);
  });
  const [historyDateFilter, setHistoryDateFilter] = useState<string>("");
  const [historyClassFilter, setHistoryClassFilter] = useState<string>("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");

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

        const today = new Date().toLocaleDateString("en-CA");
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
    : attendance;

  // Month-filtered class attendance records
  const monthClassAttendance = useMemo(() => {
    return selectedMonth === "all"
      ? classAttendance
      : classAttendance.filter((a) => a.date.startsWith(selectedMonth));
  }, [classAttendance, selectedMonth]);

  const {
    total: monthTotal,
    present: monthPresent,
    absent: monthAbsent,
    late: monthLate,
    rate: monthRate,
  } = calculateAttendanceStats(monthClassAttendance);

  // History table filtered records for teacher
  const historyFilteredRecords = useMemo(() => {
    const baseRecords = historyDateFilter
      ? attendance.filter((a) => a.date === historyDateFilter)
      : selectedMonth === "all"
      ? attendance
      : attendance.filter((a) => a.date.startsWith(selectedMonth));

    return baseRecords
      .filter((a) => {
        if (historyClassFilter !== "all") {
          if (a.class_id !== Number(historyClassFilter)) return false;
        } else if (teacherClasses.length > 0) {
          const teacherClassIds = new Set(teacherClasses.map((c) => c.id));
          if (!teacherClassIds.has(a.class_id)) return false;
        }
        if (
          historyStatusFilter !== "all" &&
          a.status.toLowerCase() !== historyStatusFilter.toLowerCase()
        )
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    attendance,
    selectedMonth,
    historyDateFilter,
    historyClassFilter,
    historyStatusFilter,
    teacherClasses,
  ]);

  const getMonthLabel = (monthStr: string) => {
    if (monthStr === "all") return "All Time";
    try {
      const [y, m] = monthStr.split("-").map(Number);
      const date = new Date(y, m - 1, 1);
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return monthStr;
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mark & Review Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage class attendance and review historical records by date or month
          </p>
        </div>

        {/* Month Selector Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <Calendar className="h-4 w-4 text-gray-500 shrink-0 ml-1" />
          <input
            type="month"
            value={selectedMonth === "all" ? "" : selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || "all")}
            className="text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() =>
              setSelectedMonth(
                selectedMonth === "all"
                  ? new Date().toLocaleDateString("en-CA").slice(0, 7)
                  : "all"
              )
            }
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              selectedMonth === "all"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {selectedMonth === "all" ? "Current Month" : "All Months"}
          </button>
        </div>
      </div>

      {/* Monthly Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">
            {getMonthLabel(selectedMonth)} Rate
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{monthRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-0.5" title="Attended count includes Present and Late arrivals">
            Attended: {monthPresent + monthLate} of {monthTotal}
            {monthTotal > 0 ? ` (${monthPresent} present + ${monthLate} late)` : ""}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">Present</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{monthPresent}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {monthTotal > 0 ? `${Math.round((monthPresent / monthTotal) * 100)}% on time` : "0%"}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">Absent</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{monthAbsent}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {monthTotal > 0 ? `${Math.round((monthAbsent / monthTotal) * 100)}% unexcused` : "0%"}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">Late</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{monthLate}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {monthTotal > 0 ? `${Math.round((monthLate / monthTotal) * 100)}% (attended)` : "0%"}
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          Mark Daily Attendance
        </h2>
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
          className={`card ${
            message.includes("Failed")
              ? "border-danger-200 bg-danger-50"
              : "border-green-200 bg-green-50"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Roll No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Marked
                  </th>
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
                        <div className="text-sm font-medium text-gray-900">
                          {s.full_name || `Student #${s.id}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          Roll No: {s.roll_number || "N/A"}
                        </div>
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

      {/* Historical Monthly Attendance Review for Teacher */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5 text-primary-600" />
              Attendance Records ({getMonthLabel(selectedMonth)})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Filter past records by date, class, and status
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Specific Date Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-2.5 py-1 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setHistoryDateFilter(val);
                  if (val && selectedMonth !== "all" && !val.startsWith(selectedMonth)) {
                    setSelectedMonth(val.slice(0, 7));
                  }
                }}
                className="text-xs focus:outline-none bg-transparent text-gray-800"
                placeholder="Filter by date"
                title="Filter by specific date"
              />
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter("")}
                  className="text-gray-400 hover:text-gray-600 text-xs px-1 font-bold"
                  title="Clear date filter"
                >
                  ×
                </button>
              )}
            </div>

            {/* Class Filter */}
            <select
              value={historyClassFilter}
              onChange={(e) => setHistoryClassFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white shadow-2xs"
            >
              <option value="all">All My Classes</option>
              {teacherClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section || ""}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white capitalize shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
        </div>

        <AttendanceRecordsList
          records={historyFilteredRecords}
          students={students}
          classes={classes}
          showStudentInfo={true}
          showClassInfo={true}
          emptyMessage={
            historyDateFilter
              ? `No attendance records found for ${formatDate(historyDateFilter)} with selected filters.`
              : `No attendance records for ${getMonthLabel(selectedMonth)}.`
          }
        />
      </div>
    </div>
  );
}
