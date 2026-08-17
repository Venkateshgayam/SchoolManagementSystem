"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Calendar, TrendingUp, Filter } from "lucide-react";
import api from "@/lib/api";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { calculateAttendanceStats } from "@/lib/attendanceCalculations";
import AttendanceRecordsList from "@/components/dashboard/AttendanceRecordsList";

interface AttendanceRecord {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: string;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
}

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to current month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toLocaleDateString('en-CA').slice(0, 7);
  });
  const [historyDateFilter, setHistoryDateFilter] = useState<string>("");

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const [attendanceRes, studentRes, classesRes] = await Promise.all([
          api.get("/attendance/").catch(() => ({ data: [] })),
          api.get("/students/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
        ]);

        const student = studentRes.data;
        const records = attendanceRes.data.filter((r: AttendanceRecord) => r.student_id === student?.id);
        setAttendance(records);

        if (student?.class_id && classesRes.data.length > 0) {
          const cls = classesRes.data.find((c: ClassInfo) => c.id === student.class_id);
          if (cls) setClassInfo(cls);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    }

    fetchAttendance();
  }, []);

  // Filter records by selected month (or all)
  const filteredAttendance = selectedMonth === "all"
    ? attendance
    : attendance.filter((r) => r.date.startsWith(selectedMonth));

  // Date-filtered records for review
  const historyFilteredRecords = useMemo(() => {
    if (historyDateFilter) {
      return attendance.filter((r) => r.date === historyDateFilter);
    }
    return filteredAttendance;
  }, [attendance, filteredAttendance, historyDateFilter]);

  const { total, present, absent, late, rate: attendancePercent } = calculateAttendanceStats(filteredAttendance);
  const formattedPercent = Math.round(attendancePercent);

  // Format month label e.g. "August 2026"
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Viewing records for <span className="font-semibold text-primary-700">{getMonthLabel(selectedMonth)}</span>
          </p>
        </div>

        {/* Month Selector Filter */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <Calendar className="h-4 w-4 text-gray-500 shrink-0 ml-1" />
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth === "all" ? "" : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || "all")}
              className="text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={() => setSelectedMonth(selectedMonth === "all" ? new Date().toLocaleDateString('en-CA').slice(0, 7) : "all")}
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">
            {selectedMonth === "all" ? "Overall Rate" : `${getMonthLabel(selectedMonth)} Rate`}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formattedPercent}%</p>
          <p className="text-xs text-gray-400 mt-1">{total} day(s) recorded</p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Present</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-gray-400 mt-1">
            {total > 0 ? `${Math.round((present / total) * 100)}% of month` : "—"}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Absent</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{absent}</p>
          <p className="text-xs text-gray-400 mt-1">
            {total > 0 ? `${Math.round((absent / total) * 100)}% of month` : "—"}
          </p>
        </div>
      </div>

      {late > 0 && (
        <div className="card mb-6">
          <p className="text-sm font-medium text-gray-500">Late Arrivals in {getMonthLabel(selectedMonth)}</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{late}</p>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Records ({getMonthLabel(selectedMonth)})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Filter your attendance history by date</p>
          </div>

          <div className="flex items-center gap-3">
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

            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
              {historyFilteredRecords.length} record(s)
            </span>
          </div>
        </div>

        <AttendanceRecordsList
          records={historyFilteredRecords}
          classes={classInfo ? [classInfo] : []}
          showStudentInfo={false}
          showClassInfo={true}
          emptyMessage={
            historyDateFilter
              ? `No attendance records found for ${formatDate(historyDateFilter)}.`
              : `No attendance records found for ${getMonthLabel(selectedMonth)}.`
          }
        />
      </div>
    </div>
  );
}