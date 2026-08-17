"use client";

import { useMemo } from "react";
import { Calendar, CheckCircle2, XCircle, Clock, ClipboardList } from "lucide-react";
import { formatStudentNameId } from "@/lib/formatters";

export interface AttendanceRecordItem {
  id: number;
  student_id?: number | null;
  class_id?: number | null;
  date: string;
  status: string;
  marked_by?: number | null;
  created_at?: string;
}

export interface StudentLookupItem {
  id: number;
  full_name?: string;
  roll_number?: string | null;
  class_id?: number | null;
}

export interface ClassLookupItem {
  id: number;
  name: string;
  section?: string | null;
}

interface AttendanceRecordsListProps {
  records: AttendanceRecordItem[];
  students?: StudentLookupItem[];
  classes?: ClassLookupItem[];
  showStudentInfo?: boolean;
  showClassInfo?: boolean;
  emptyMessage?: string;
  maxDateGroups?: number;
}

export function formatAttendanceDateHeader(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString("en-US", { month: "long" });
    const year = dateObj.getFullYear();
    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    return `${day} ${month} ${year}, ${weekday}`;
  } catch {
    return dateStr;
  }
}

export function getAttendanceStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "present":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          Present
        </span>
      );
    case "absent":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <XCircle className="h-3 w-3 text-red-600" />
          Absent
        </span>
      );
    case "late":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
          <Clock className="h-3 w-3 text-yellow-600" />
          Late
        </span>
      );
    case "excused":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          Excused
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
          {status}
        </span>
      );
  }
}

export default function AttendanceRecordsList({
  records,
  students = [],
  classes = [],
  showStudentInfo = true,
  showClassInfo = true,
  emptyMessage = "No attendance records found.",
  maxDateGroups,
}: AttendanceRecordsListProps) {
  const studentMap = useMemo(() => {
    const map: Record<number, StudentLookupItem> = {};
    for (const s of students) {
      map[s.id] = s;
    }
    return map;
  }, [students]);

  const classMap = useMemo(() => {
    const map: Record<number, ClassLookupItem> = {};
    for (const c of classes) {
      map[c.id] = c;
    }
    return map;
  }, [classes]);

  const groupedDates = useMemo(() => {
    const map = new Map<string, AttendanceRecordItem[]>();
    for (const record of records) {
      const list = map.get(record.date) || [];
      list.push(record);
      map.set(record.date, list);
    }

    const sortedDates = Array.from(map.keys()).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const limitedDates = maxDateGroups ? sortedDates.slice(0, maxDateGroups) : sortedDates;

    return limitedDates.map((date) => {
      const groupRecords = map.get(date) || [];
      
      // Sort within the group: by student full name or ID
      groupRecords.sort((a, b) => {
        const nameA = (a.student_id && studentMap[a.student_id]?.full_name) || `Student ${a.student_id || a.id}`;
        const nameB = (b.student_id && studentMap[b.student_id]?.full_name) || `Student ${b.student_id || b.id}`;
        return nameA.localeCompare(nameB);
      });

      const presentCount = groupRecords.filter((r) => r.status.toLowerCase() === "present").length;
      const absentCount = groupRecords.filter((r) => r.status.toLowerCase() === "absent").length;
      const lateCount = groupRecords.filter((r) => r.status.toLowerCase() === "late").length;
      const excusedCount = groupRecords.filter((r) => r.status.toLowerCase() === "excused").length;

      return {
        date,
        formattedDate: formatAttendanceDateHeader(date),
        records: groupRecords,
        counts: {
          total: groupRecords.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount,
        },
      };
    });
  }, [records, maxDateGroups, studentMap]);

  if (groupedDates.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedDates.map((group) => (
        <div
          key={group.date}
          className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs"
        >
          {/* Date Header */}
          <div className="bg-gray-50/90 px-4 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-600 shrink-0" />
              <h3 className="text-sm font-bold text-gray-900">{group.formattedDate}</h3>
            </div>

            {/* Quick summary counts per date */}
            {group.counts.total > 1 && (
              <div className="flex items-center gap-2 text-xs">
                {group.counts.present > 0 && (
                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium border border-green-200">
                    {group.counts.present} Present
                  </span>
                )}
                {group.counts.absent > 0 && (
                  <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium border border-red-200">
                    {group.counts.absent} Absent
                  </span>
                )}
                {group.counts.late > 0 && (
                  <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 font-medium border border-yellow-200">
                    {group.counts.late} Late
                  </span>
                )}
                {group.counts.excused > 0 && (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                    {group.counts.excused} Excused
                  </span>
                )}
                <span className="text-gray-400">({group.counts.total} students)</span>
              </div>
            )}
          </div>

          {/* Daily Attendance Register List */}
          {showStudentInfo ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Roll No.
                    </th>
                    {showClassInfo && (
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                    )}
                    <th className="px-4 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {group.records.map((record) => {
                    const s = record.student_id ? studentMap[record.student_id] : undefined;
                    const cls = record.class_id
                      ? classMap[record.class_id]
                      : s?.class_id
                      ? classMap[s.class_id]
                      : null;

                    return (
                      <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatStudentNameId(s?.full_name, record.student_id || record.id, s?.roll_number)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                          {s?.roll_number || "—"}
                        </td>
                        {showClassInfo && (
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                            {cls ? `${cls.name} ${cls.section || ""}`.trim() : "—"}
                          </td>
                        )}
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm">
                          {getAttendanceStatusBadge(record.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3.5 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Status:</span>
                {getAttendanceStatusBadge(group.records[0]?.status)}
              </div>
              {showClassInfo && group.records[0]?.class_id && classMap[group.records[0].class_id] && (
                <span className="text-xs text-gray-500">
                  {classMap[group.records[0].class_id].name} {classMap[group.records[0].class_id].section || ""}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
