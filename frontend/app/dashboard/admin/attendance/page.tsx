"use client";

import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Calendar, Save, History, Users } from "lucide-react";
import { formatStudentNameId, formatDate } from "@/lib/formatters";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { calculateAttendanceStats } from "@/lib/attendanceCalculations";
import AttendanceRecordsList from "@/components/dashboard/AttendanceRecordsList";

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

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Month filter for review (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toLocaleDateString("en-CA").slice(0, 7);
  });
  const [historyDateFilter, setHistoryDateFilter] = useState<string>("");
  const [historyClassFilter, setHistoryClassFilter] = useState<string>("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA");
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
    () => (selectedClassId ? students.filter((s) => s.class_id === selectedClassId) : []),
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

  // Month-filtered attendance records
  const monthAttendance = useMemo(() => {
    return selectedMonth === "all"
      ? attendance
      : attendance.filter((a) => a.date.startsWith(selectedMonth));
  }, [attendance, selectedMonth]);

  const {
    total: monthTotal,
    present: monthPresent,
    absent: monthAbsent,
    late: monthLate,
    rate: monthRate,
  } = calculateAttendanceStats(monthAttendance);

  // History table filtered records
  const historyFilteredRecords = useMemo(() => {
    const sourceRecords = historyDateFilter
      ? attendance.filter((a) => a.date === historyDateFilter)
      : monthAttendance;

    return sourceRecords
      .filter((a) => {
        if (historyClassFilter !== "all" && a.class_id !== Number(historyClassFilter)) return false;
        if (
          historyStatusFilter !== "all" &&
          a.status.toLowerCase() !== historyStatusFilter.toLowerCase()
        )
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, monthAttendance, historyDateFilter, historyClassFilter, historyStatusFilter]);

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
          (record) =>
            record.student_id === entry.student_id &&
            record.class_id === entry.class_id &&
            record.date === entry.date
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

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading attendance…</div>
      </div>
    );
  if (error)
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mark daily attendance and review historical monthly records
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
          <p className="text-xs text-gray-400 mt-0.5">{monthTotal} total mark(s)</p>
        </div>
        <div className="card text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">Present</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{monthPresent}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {monthTotal > 0 ? `${Math.round((monthPresent / monthTotal) * 100)}%` : "0%"}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">Absent</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{monthAbsent}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {monthTotal > 0 ? `${Math.round((monthAbsent / monthTotal) * 100)}%` : "0%"}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">Late</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{monthLate}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {monthTotal > 0 ? `${Math.round((monthLate / monthTotal) * 100)}%` : "0%"}
          </p>
        </div>
      </div>

      {/* Mark / Edit Attendance Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          Mark / Update Daily Attendance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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

        {selectedClassId === null ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              Select a class above to mark or modify attendance.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500 text-sm">No students assigned to this class.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Roll No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status ({selectedDate})
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => {
                    const currentStatus =
                      statusMap[student.id] ??
                      existingRecords.find((record) => record.student_id === student.id)?.status ??
                      "";
                    return (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatStudentNameId(
                            student.full_name,
                            student.id,
                            student.roll_number
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {student.roll_number || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            className="input w-40"
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(student.id, e.target.value)}
                          >
                            <option value="">Select status</option>
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Updating attendance for{" "}
              <span className="font-semibold">{filteredStudents.length}</span> student(s) on{" "}
              <span className="font-semibold">{selectedDate}</span>.
            </p>
          </div>
        )}
      </div>

      {/* Historical Monthly Attendance Review Section */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5 text-primary-600" />
              Attendance Records Review ({getMonthLabel(selectedMonth)})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Filter past records by date, class, and status for the selected month
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

            <select
              value={historyClassFilter}
              onChange={(e) => setHistoryClassFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white shadow-2xs"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section || ""}
                </option>
              ))}
            </select>

            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white capitalize shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
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
              : `No attendance records found for ${getMonthLabel(selectedMonth)} with selected filters.`
          }
        />
      </div>
    </div>
  );
}
