export interface HolidayItem {
  id?: number;
  type: string; // 'recurring' | 'specific'
  day?: string | null;
  date?: string | null;
  class_id?: number | null;
  reason?: string | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function calculateAttendanceStats(
  attendanceRecords: { status: string; student_id?: number; date?: string; class_id?: number }[],
  holidays?: HolidayItem[],
  classId?: number | null
) {
  const recurringDays = new Set<string>();
  const specificDates = new Set<string>();

  if (holidays && holidays.length > 0) {
    for (const h of holidays) {
      // Check if holiday applies to this class or is school-wide
      if (classId !== undefined && classId !== null && h.class_id !== null && h.class_id !== undefined && h.class_id !== classId) {
        continue;
      }
      if (h.type === "recurring" && h.day) {
        recurringDays.add(h.day.trim().toLowerCase());
      } else if (h.type === "specific" && h.date) {
        const dStr = typeof h.date === "string" ? h.date.split("T")[0] : String(h.date);
        specificDates.add(dStr);
      }
    }
  }

  const uniqueRecords: { status: string; student_id?: number; date?: string }[] = [];
  const seen = new Set<string>();

  for (const record of attendanceRecords) {
    const status = record.status?.toLowerCase();
    
    // Check if record date falls on a Sunday or holiday
    if (record.date) {
      const dStr = record.date.split("T")[0];
      const parsedDate = new Date(`${dStr}T00:00:00`);
      if (!isNaN(parsedDate.getTime())) {
        const dayName = DAY_NAMES[parsedDate.getDay()].toLowerCase();

        // Exclude Sunday (day 0)
        if (parsedDate.getDay() === 0) {
          continue;
        }
        // Exclude recurring weekday holiday
        if (recurringDays.has(dayName)) {
          continue;
        }
        // Exclude specific holiday date
        if (specificDates.has(dStr)) {
          continue;
        }
      }
    }
    
    if (record.student_id !== undefined && record.date !== undefined) {
      const key = `${record.student_id}_${record.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push({ ...record, status });
      } else {
        // Deduplication: if there are multiple records for the same student on the same date,
        // we keep the "best" attendance status: present > late > absent.
        const existingIndex = uniqueRecords.findIndex(r => r.student_id === record.student_id && r.date === record.date);
        if (existingIndex !== -1) {
          const existingStatus = uniqueRecords[existingIndex].status;
          if (existingStatus === 'absent' && (status === 'present' || status === 'late')) {
             uniqueRecords[existingIndex] = { ...record, status };
          } else if (existingStatus === 'late' && status === 'present') {
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
  const total = present + late + absent;
  const rate = total > 0 ? ((present + late) / total) * 100 : 0;
  
  return { total, present, late, absent, rate };
}
