export interface HolidayItem {
  id?: number;
  type: string; // 'recurring' | 'specific'
  day?: string | null;
  date?: string | null;
  class_id?: number | null;
  reason?: string | null;
}

export function calculateAttendanceStats(
  attendanceRecords: { status: string; student_id?: number; date?: string; class_id?: number }[],
  _holidays?: HolidayItem[],
  _classId?: number | null
) {
  const uniqueRecords: { status: string; student_id?: number; date?: string }[] = [];
  const seen = new Set<string>();

  for (const record of attendanceRecords) {
    const status = record.status?.toLowerCase();
    
    if (record.student_id !== undefined && record.date !== undefined) {
      const key = `${record.student_id}_${record.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push({ ...record, status });
      } else {
        // Deduplication: if there are multiple records for the same student on the same date,
        // we keep the "best" attendance status: present > late > excused > absent.
        const existingIndex = uniqueRecords.findIndex(
          (r) => r.student_id === record.student_id && r.date === record.date
        );
        if (existingIndex !== -1) {
          const existingStatus = uniqueRecords[existingIndex].status;
          if (
            existingStatus === "absent" &&
            (status === "present" || status === "late" || status === "excused")
          ) {
            uniqueRecords[existingIndex] = { ...record, status };
          } else if (
            existingStatus === "excused" &&
            (status === "present" || status === "late")
          ) {
            uniqueRecords[existingIndex] = { ...record, status };
          } else if (existingStatus === "late" && status === "present") {
            uniqueRecords[existingIndex] = { ...record, status };
          }
        }
      }
    } else {
      // Cannot deduplicate if missing IDs or dates
      uniqueRecords.push({ ...record, status });
    }
  }

  const present = uniqueRecords.filter((a) => a.status === "present").length;
  const late = uniqueRecords.filter((a) => a.status === "late").length;
  const absent = uniqueRecords.filter((a) => a.status === "absent").length;
  const excused = uniqueRecords.filter((a) => a.status === "excused").length;
  const total = present + late + absent + excused;
  const attended = present + late;
  const rate = total > 0 ? (attended / total) * 100 : 0;
  
  return { total, present, late, absent, excused, attended, rate };
}
