"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import { ClipboardList, Calendar, TrendingUp } from "lucide-react";
import api from "@/lib/api";

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

  const total = attendance.length;
  const present = attendance.filter((r) => r.status === "present").length;
  const absent = attendance.filter((r) => r.status === "absent").length;
  const late = attendance.filter((r) => r.status === "late").length;
  const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0;

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Attendance</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Overall</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{attendancePercent}%</p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Present</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{present}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Absent</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{absent}</p>
        </div>
      </div>

      {late > 0 && (
        <div className="card mb-6">
          <p className="text-sm font-medium text-gray-500">Late</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{late}</p>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance History</h2>
        {attendance.length === 0 ? (
          <p className="text-gray-600">No attendance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === "present"
                              ? "bg-green-100 text-green-800"
                              : record.status === "absent"
                              ? "bg-red-100 text-red-800"
                              : record.status === "late"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}