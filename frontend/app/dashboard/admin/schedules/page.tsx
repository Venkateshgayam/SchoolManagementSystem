"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Clock,
  UserCheck,
  Plus,
  Save,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Palmtree,
  CalendarDays,
  Sparkles,
  Info,
} from "lucide-react";
import api, { getErrorMessage } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import PageLoader from "@/components/dashboard/PageLoader";
import StatCard from "@/components/dashboard/StatCard";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";
import { useSettings } from "@/hooks/useSettings";

interface ScheduleRecord {
  id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number | null;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year: string | null;
  created_at: string;
}

interface ClassRecord {
  id: number;
  name: string;
  section: string | null;
}

interface SubjectRecord {
  id: number;
  name: string;
  code: string | null;
  teacher_ids: number[];
}

interface TeacherRecord {
  id: number;
  full_name: string | null;
}

interface TeacherAssignment {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number | null;
  teacher_name?: string | null;
  class_name?: string | null;
  subject_name?: string | null;
}

interface HolidayRecord {
  id: number;
  type: "recurring" | "specific";
  day: string | null;
  date: string | null;
  class_id: number | null;
  reason: string | null;
  created_by: number | null;
  created_at: string;
}

interface HolidayCalendarEntry {
  date: string;
  day: string;
  reason: string | null;
  type: "recurring" | "specific";
  class_id: number | null;
}

const DAYS = [
  { index: 0, name: "Monday", short: "Mon" },
  { index: 1, name: "Tuesday", short: "Tue" },
  { index: 2, name: "Wednesday", short: "Wed" },
  { index: 3, name: "Thursday", short: "Thu" },
  { index: 4, name: "Friday", short: "Fri" },
  { index: 5, name: "Saturday", short: "Sat" },
];

const STANDARD_PERIODS = [
  { label: "Period 1", start: "09:00", end: "10:00" },
  { label: "Period 2", start: "10:00", end: "11:00" },
  { label: "Period 3", start: "11:00", end: "12:00" },
  { label: "Lunch Break", start: "12:00", end: "13:00", isLunch: true },
  { label: "Period 4", start: "13:00", end: "14:00" },
  { label: "Period 5", start: "14:00", end: "15:00" },
  { label: "Period 6", start: "15:00", end: "16:00" },
  { label: "Period 7", start: "16:00", end: "17:00" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");

  // Schedule slot modal states
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states for schedule
  const [formClassId, setFormClassId] = useState<number | "">("");
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(0);
  const [formSubjectId, setFormSubjectId] = useState<number | "">("");
  const [formTeacherId, setFormTeacherId] = useState<number | "">("");
  const [formRoom, setFormRoom] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");

  // Holiday management modal & form states
  const [holidayToggleDay, setHolidayToggleDay] = useState<{ index: number; name: string } | null>(null);
  const [holidayReasonInput, setHolidayReasonInput] = useState("");
  const [holidayScopeSchoolWide, setHolidayScopeSchoolWide] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [deleteHolidayTarget, setDeleteHolidayTarget] = useState<HolidayRecord | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState(false);

  // Specific holiday form states
  const [specificDate, setSpecificDate] = useState("");
  const [specificReason, setSpecificReason] = useState("");
  const [specificSchoolWide, setSpecificSchoolWide] = useState(true);
  const [submittingSpecific, setSubmittingSpecific] = useState(false);

  // Holiday Calendar month view states
  const currentDate = new Date();
  const [calMonth, setCalMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [calYear, setCalYear] = useState(currentDate.getFullYear());
  const [calendarEntries, setCalendarEntries] = useState<HolidayCalendarEntry[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const { settings } = useSettings();

  const fetchData = async () => {
    try {
      const [s, c, sub, t, a, h] = await Promise.all([
        api.get("/schedules/").catch(() => ({ data: [] })),
        api.get("/classes/").catch(() => ({ data: [] })),
        api.get("/subjects/").catch(() => ({ data: [] })),
        api.get("/teachers/").catch(() => ({ data: [] })),
        api.get("/teacher-class-assignments/").catch(() => ({ data: [] })),
        api.get("/holidays/").catch(() => ({ data: [] })),
      ]);
      setSchedules(s.data);
      setClasses(c.data);
      setSubjects(sub.data);
      setTeachers(t.data);
      setAssignments(a.data);
      setHolidays(h.data);

      if (c.data.length > 0 && selectedClassId === null) {
        setSelectedClassId(c.data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async () => {
    setLoadingCalendar(true);
    try {
      const params: any = { month: calMonth, year: calYear };
      if (selectedClassId) params.classId = selectedClassId;
      const res = await api.get("/holidays/calendar", { params });
      setCalendarEntries(res.data || []);
    } catch (err) {
      console.error("Failed to load holiday calendar", err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (viewMode === "calendar") {
      fetchCalendar();
    }
  }, [viewMode, calMonth, calYear, selectedClassId]);

  const className = (id: number) => {
    const c = classes.find((cl) => cl.id === id);
    return c ? `${c.name} ${c.section || ""}`.trim() : `#${id}`;
  };

  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name || `#${id}`;
  const teacherName = (id: number) => teachers.find((t) => t.id === id)?.full_name || `#${id}`;

  // Filter schedules for the selected class in grid view
  const currentClassSchedules = useMemo(() => {
    if (!selectedClassId) return schedules;
    return schedules.filter((s) => s.class_id === selectedClassId);
  }, [schedules, selectedClassId]);

  // Recurring holidays that apply to the selected class (class-specific or school-wide)
  const activeRecurringHolidays = useMemo(() => {
    return holidays.filter(
      (h) => h.type === "recurring" && (h.class_id === null || h.class_id === selectedClassId)
    );
  }, [holidays, selectedClassId]);

  const getHolidayForDay = (dayName: string) => {
    return activeRecurringHolidays.find(
      (h) => h.day?.toLowerCase() === dayName.toLowerCase()
    );
  };

  const resetForm = () => {
    setFormClassId(selectedClassId || (classes[0]?.id ?? ""));
    setFormDayOfWeek(0);
    setFormSubjectId("");
    setFormTeacherId("");
    setFormRoom("");
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setEditing(null);
  };

  const openCreate = (dayIdx?: number, startT?: string, endT?: string) => {
    resetForm();
    if (selectedClassId) setFormClassId(selectedClassId);
    if (dayIdx !== undefined) setFormDayOfWeek(dayIdx);
    if (startT) setFormStartTime(startT);
    if (endT) setFormEndTime(endT);
    setOpen(true);
  };

  const openEdit = (s: ScheduleRecord) => {
    setEditing(s);
    setFormClassId(s.class_id);
    setFormDayOfWeek(s.day_of_week);
    setFormSubjectId(s.subject_id);
    setFormTeacherId(s.teacher_id || "");
    setFormRoom(s.room || "");
    setFormStartTime(s.start_time.substring(0, 5));
    setFormEndTime(s.end_time.substring(0, 5));
    setOpen(true);
  };

  // Teachers assigned to selected class and subject
  const assignedTeachersForForm = useMemo(() => {
    if (!formClassId) return teachers;
    const classAssignments = assignments.filter((a) => a.class_id === formClassId);
    if (!formSubjectId) {
      const teacherIds = new Set(classAssignments.map((a) => a.teacher_id));
      return teachers.filter((t) => teacherIds.has(t.id));
    }
    const matchingAssignments = classAssignments.filter(
      (a) => a.subject_id === formSubjectId || a.subject_id === null
    );
    const teacherIds = new Set(matchingAssignments.map((a) => a.teacher_id));
    return teachers.filter((t) => teacherIds.has(t.id));
  }, [assignments, formClassId, formSubjectId, teachers]);

  const handleSubmit = async () => {
    if (formClassId === "" || formSubjectId === "" || !formStartTime || !formEndTime) {
      toast.error("Please fill in Class, Subject, Start Time, and End Time.");
      return;
    }

    // Client-side lunch break check
    if (
      (formStartTime >= "12:00" && formStartTime < "13:00") ||
      (formEndTime > "12:00" && formEndTime <= "13:00") ||
      (formStartTime < "12:00" && formEndTime > "12:00")
    ) {
      toast.error("12:00 PM - 1:00 PM is reserved for Lunch Break. Classes cannot overlap with this window.");
      return;
    }

    if (formStartTime < "09:00" || formEndTime > "17:00") {
      toast.error("Class timings must be between 09:00 AM and 05:00 PM.");
      return;
    }

    if (formStartTime >= formEndTime) {
      toast.error("Start time must be before end time.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        class_id: Number(formClassId),
        subject_id: Number(formSubjectId),
        teacher_id: formTeacherId !== "" ? Number(formTeacherId) : null,
        room: formRoom.trim() ? formRoom.trim() : null,
        day_of_week: formDayOfWeek,
        start_time: formStartTime.length === 5 ? formStartTime + ":00" : formStartTime,
        end_time: formEndTime.length === 5 ? formEndTime + ":00" : formEndTime,
      };

      if (editing) {
        await api.put(`/schedules/${editing.id}`, payload);
        toast.success("Schedule updated successfully.");
      } else {
        await api.post("/schedules/", payload);
        toast.success("Schedule created successfully.");
      }
      setOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to save schedule."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/schedules/${deleteTarget.id}`);
      toast.success("Schedule slot deleted.");
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to delete schedule."));
    } finally {
      setDeleting(false);
    }
  };

  // Day header recurring holiday toggle handler
  const handleDayHeaderClick = (day: { index: number; name: string }) => {
    const existingHoliday = getHolidayForDay(day.name);
    if (existingHoliday) {
      // Prompt to remove
      setDeleteHolidayTarget(existingHoliday);
    } else {
      // Prompt to mark as recurring holiday
      setHolidayToggleDay(day);
      setHolidayReasonInput(`${day.name} Holiday`);
      setHolidayScopeSchoolWide(false);
    }
  };

  const handleSaveRecurringHoliday = async () => {
    if (!holidayToggleDay) return;
    setSavingHoliday(true);
    try {
      const targetClassId = holidayScopeSchoolWide ? null : (selectedClassId ? Number(selectedClassId) : null);
      await api.post("/holidays/", {
        type: "recurring",
        day: holidayToggleDay.name,
        class_id: targetClassId,
        classId: targetClassId,
        reason: holidayReasonInput.trim() || `${holidayToggleDay.name} Holiday`,
      });
      toast.success(`${holidayToggleDay.name} marked as recurring holiday.`);
      setHolidayToggleDay(null);
      await fetchData();
      if (viewMode === "calendar") await fetchCalendar();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to set recurring holiday."));
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deleteHolidayTarget) return;
    setDeletingHoliday(true);
    try {
      await api.delete(`/holidays/${deleteHolidayTarget.id}`);
      toast.success("Holiday removed successfully.");
      setDeleteHolidayTarget(null);
      await fetchData();
      if (viewMode === "calendar") await fetchCalendar();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to remove holiday."));
    } finally {
      setDeletingHoliday(false);
    }
  };

  const handleCreateSpecificHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificDate) {
      toast.error("Please pick a holiday date.");
      return;
    }
    setSubmittingSpecific(true);
    try {
      const targetClassId = specificSchoolWide ? null : (selectedClassId ? Number(selectedClassId) : null);
      await api.post("/holidays/", {
        type: "specific",
        date: specificDate,
        class_id: targetClassId,
        classId: targetClassId,
        reason: specificReason.trim() || "School Holiday",
      });
      toast.success("Specific holiday added successfully.");
      setSpecificDate("");
      setSpecificReason("");
      await fetchData();
      if (viewMode === "calendar") await fetchCalendar();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to add holiday."));
    } finally {
      setSubmittingSpecific(false);
    }
  };

  const prevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  if (loading) return <PageLoader label="Loading timetables…" />;
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

  // Calendar month days calculation
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();

  return (
    <div>
      <PageHeader
        title="Schedules & Timetable"
        subtitle="Manage weekly class timetables, periods, room assignments, and academic holidays"
        icon={BookOpen}
        action={
          <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Schedule Slot
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Slots" value={schedules.length} icon={Clock} />
        <StatCard title="Classes Configured" value={new Set(schedules.map((s) => s.class_id)).size} icon={BookOpen} />
        <StatCard title="Subjects Covered" value={new Set(schedules.map((s) => s.subject_id)).size} icon={UserCheck} />
        <StatCard title="Active Holidays" value={holidays.length} icon={Palmtree} />
      </div>

      {/* Class Selector and View Switcher */}
      <div className="card mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Selected Class:</label>
          <select
            value={selectedClassId ?? ""}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
            className="input-field max-w-xs font-medium"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section || ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50 flex-wrap">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "grid"
                ? "bg-white text-primary-700 shadow-xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Weekly Timetable
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "list"
                ? "bg-white text-primary-700 shadow-xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ListIcon className="h-3.5 w-3.5" /> List View
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "calendar"
                ? "bg-white text-primary-700 shadow-xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Holiday Calendar
          </button>
        </div>
      </div>

      {/* Weekly Timetable View */}
      {viewMode === "grid" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary-600" />
              Tip: Click on any day column header to toggle a recurring non-teaching holiday for that day.
            </span>
          </div>

          <div className="card overflow-x-auto">
            <div className="min-w-[900px]">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100/80">
                    <th className="border border-gray-200 p-3 text-left text-xs font-bold text-gray-600 uppercase w-32">
                      Time / Period
                    </th>
                    {DAYS.map((day) => {
                      const hol = getHolidayForDay(day.name);
                      return (
                        <th
                          key={day.index}
                          onClick={() => handleDayHeaderClick(day)}
                          className={`border border-gray-200 p-3 text-center text-xs font-bold uppercase cursor-pointer select-none transition-all group ${
                            hol
                              ? "bg-amber-100/90 text-amber-900 hover:bg-amber-200/90 border-amber-300"
                              : "text-gray-700 hover:bg-gray-200/80"
                          }`}
                          title={hol ? `Holiday: ${hol.reason || 'Non-teaching'}. Click to remove.` : `Click to mark ${day.name} as holiday.`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="group-hover:underline flex items-center gap-1">
                              {day.name}
                            </span>
                            {hol ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200 text-amber-900 border border-amber-300">
                                🏖️ {hol.reason || "Holiday"}
                              </span>
                            ) : (
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 font-normal transition-opacity">
                                Mark Holiday
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {STANDARD_PERIODS.map((period, pIdx) => {
                    if (period.isLunch) {
                      return (
                        <tr key="lunch" className="bg-amber-50/70 border-y-2 border-amber-200">
                          <td className="border border-amber-200 p-3 text-xs font-bold text-amber-800 whitespace-nowrap text-center">
                            12:00 - 13:00
                          </td>
                          <td
                            colSpan={DAYS.length}
                            className="border border-amber-200 p-2.5 text-center text-xs font-semibold text-amber-800 tracking-wider"
                          >
                            🍱 LUNCH BREAK (12:00 PM – 1:00 PM) — NO CLASSES
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={period.label} className="hover:bg-gray-50/50">
                        <td className="border border-gray-200 p-3 text-xs font-medium text-gray-600 whitespace-nowrap bg-gray-50/60">
                          <div className="font-bold text-gray-900">{period.label}</div>
                          <div className="text-gray-500">{period.start} – {period.end}</div>
                        </td>

                        {DAYS.map((day) => {
                          const dayHoliday = getHolidayForDay(day.name);

                          // If the day is marked as a recurring holiday, gray out the entire column cell
                          if (dayHoliday) {
                            return (
                              <td
                                key={day.index}
                                className="border border-gray-200 p-2 text-xs align-top relative min-h-[90px] h-[90px] bg-gray-100/70"
                              >
                                <div className="h-full flex flex-col items-center justify-center p-2 rounded-lg bg-amber-50/60 border border-dashed border-amber-200/80 text-center">
                                  <Palmtree className="h-4 w-4 text-amber-600 mb-1 opacity-75" />
                                  <span className="text-[11px] font-semibold text-amber-900">
                                    {dayHoliday.reason || `${day.name} Holiday`}
                                  </span>
                                  <span className="text-[10px] text-amber-700/80">Non-teaching</span>
                                </div>
                              </td>
                            );
                          }

                          // Find matching schedule entry for this day and slot
                          const match = currentClassSchedules.find((s) => {
                            if (s.day_of_week !== day.index) return false;
                            const sStart = s.start_time.slice(0, 5);
                            const sEnd = s.end_time.slice(0, 5);
                            // Overlap condition with period
                            return Math.max(
                              sStart.localeCompare(period.start),
                              0
                            ) === 0 && Math.min(
                              sEnd.localeCompare(period.end),
                              0
                            ) === 0 || (sStart <= period.start && sEnd >= period.end);
                          });

                          return (
                            <td
                              key={day.index}
                              className="border border-gray-200 p-2 text-xs align-top relative min-h-[90px] h-[90px]"
                            >
                              {match ? (
                                <div className="h-full flex flex-col justify-between p-2 rounded-lg bg-blue-50/80 border border-blue-200 shadow-2xs group hover:bg-blue-100/80 transition-colors">
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-blue-900 truncate">
                                        {subjectName(match.subject_id)}
                                      </span>
                                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                        <button
                                          onClick={() => openEdit(match)}
                                          className="p-1 hover:bg-blue-200 text-blue-800 rounded"
                                          title="Edit slot"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteTarget(match)}
                                          className="p-1 hover:bg-red-200 text-red-700 rounded"
                                          title="Delete slot"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-blue-700 font-medium truncate mt-0.5">
                                      {match.teacher_id ? teacherName(match.teacher_id) : "—"}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-blue-600 mt-1 border-t border-blue-200/60 pt-1">
                                    <span>{match.start_time.slice(0, 5)} - {match.end_time.slice(0, 5)}</span>
                                    {match.room && (
                                      <span className="font-medium bg-blue-200/60 px-1 rounded">
                                        Rm {match.room}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openCreate(day.index, period.start, period.end)}
                                  className="w-full h-full rounded border border-dashed border-gray-200 hover:border-primary-400 hover:bg-primary-50/40 text-gray-300 hover:text-primary-600 flex items-center justify-center transition-all group"
                                  title="Add class slot"
                                >
                                  <span className="opacity-0 group-hover:opacity-100 text-xs font-semibold flex items-center gap-1">
                                    <Plus className="h-3.5 w-3.5" /> Add
                                  </span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="card space-y-4">
          {/* Holiday Banners in List View */}
          {activeRecurringHolidays.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center gap-2 text-xs text-amber-900">
              <Palmtree className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="font-bold">Recurring Holidays:</span>
              {activeRecurringHolidays.map((h) => (
                <span
                  key={h.id}
                  className="bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300 font-medium"
                >
                  {h.day}: {h.reason || "Holiday"} ({h.class_id ? "Class" : "School-wide"})
                </span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentClassSchedules
                  .slice()
                  .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                  .map((s) => {
                    const dayName = DAYS[s.day_of_week]?.name;
                    const hol = dayName ? getHolidayForDay(dayName) : null;

                    return (
                      <tr key={s.id} className={`hover:bg-gray-50 ${hol ? "bg-amber-50/40" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 flex items-center gap-2">
                          {DAYS[s.day_of_week]?.name || `#${s.day_of_week}`}
                          {hol && (
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              🏖️ Holiday
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {className(s.class_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {subjectName(s.subject_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <Clock className="h-4 w-4 inline mr-1 text-gray-400" />
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {s.room || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {s.teacher_id ? teacherName(s.teacher_id) : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded mr-1.5"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{currentClassSchedules.length} schedule slot(s)</p>
        </div>
      )}

      {/* Holiday Calendar View (Tab 3) */}
      {viewMode === "calendar" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Monthly Holiday Calendar */}
            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary-600" />
                  <h2 className="text-lg font-bold text-gray-900">
                    {MONTH_NAMES[calMonth - 1]} {calYear}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setCalMonth(currentDate.getMonth() + 1);
                      setCalYear(currentDate.getFullYear());
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 hover:bg-gray-100 text-gray-700"
                  >
                    Today
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-gray-500 uppercase pb-2">
                <div className="text-rose-600">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[85px] p-1 bg-gray-50/50 rounded-lg border border-transparent" />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const dayOfWeek = new Date(calYear, calMonth - 1, dayNum).getDay();
                  const isSunday = dayOfWeek === 0;

                  const holidayMatch = calendarEntries.find((e) => e.date === dateStr);

                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[85px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                        holidayMatch
                          ? "bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs ring-1 ring-rose-200"
                          : isSunday
                          ? "bg-amber-50/50 border-amber-200 text-amber-900"
                          : "bg-white border-gray-200 text-gray-800 hover:border-gray-300"
                      }`}
                      title={holidayMatch ? `${holidayMatch.reason || "Holiday"} (${holidayMatch.type})` : isSunday ? "Sunday Weekend" : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${holidayMatch ? "text-rose-700" : isSunday ? "text-amber-700" : "text-gray-700"}`}>
                          {dayNum}
                        </span>
                        {holidayMatch && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-rose-200/90 text-rose-800">
                            {holidayMatch.type === "specific" ? "Festival" : "Recurring"}
                          </span>
                        )}
                        {isSunday && !holidayMatch && (
                          <span className="text-[9px] font-semibold text-amber-700">Sun</span>
                        )}
                      </div>

                      {holidayMatch && (
                        <div className="mt-1">
                          <p className="text-[11px] font-semibold text-rose-900 truncate" title={holidayMatch.reason || "Holiday"}>
                            🏖️ {holidayMatch.reason || "Holiday"}
                          </p>
                          <span className="text-[10px] text-rose-600 block truncate">
                            {holidayMatch.class_id ? className(holidayMatch.class_id) : "School-wide"}
                          </span>
                        </div>
                      )}

                      {!holidayMatch && isSunday && (
                        <div className="mt-1">
                          <span className="text-[10px] text-amber-600 font-medium">Non-teaching</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Add Specific Holiday Form + Holidays List */}
            <div className="space-y-6">
              {/* Specific Date Holiday Form */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <Sparkles className="h-4 w-4 text-primary-600" />
                  <h3 className="text-sm font-bold text-gray-900">Mark Specific Date as Holiday</h3>
                </div>
                <form onSubmit={handleCreateSpecificHoliday} className="space-y-3">
                  <div>
                    <label className="label text-xs">Holiday Date *</label>
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="input-field text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="label text-xs">Reason / Festival Name *</label>
                    <input
                      type="text"
                      value={specificReason}
                      onChange={(e) => setSpecificReason(e.target.value)}
                      placeholder="e.g. Diwali, Independence Day"
                      className="input-field text-sm"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="specificSchoolWide"
                      checked={specificSchoolWide}
                      onChange={(e) => setSpecificSchoolWide(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                    />
                    <label htmlFor="specificSchoolWide" className="text-xs text-gray-700">
                      Apply School-wide (all classes)
                    </label>
                  </div>

                  {!specificSchoolWide && selectedClassId && (
                    <p className="text-[11px] text-primary-700 bg-primary-50 p-2 rounded border border-primary-200">
                      Applies only to <strong>{className(selectedClassId)}</strong>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submittingSpecific}
                    className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {submittingSpecific ? "Adding…" : "Add Specific Holiday"}
                  </button>
                </form>
              </div>

              {/* Active Holidays List */}
              <div className="card">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Configured Holidays</h3>
                  <span className="text-xs text-gray-500">{holidays.length} total</span>
                </div>

                {holidays.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No holidays configured yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {holidays.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2 rounded-md bg-gray-50 border border-gray-200 text-xs"
                      >
                        <div className="overflow-hidden mr-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                h.type === "recurring"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {h.type}
                            </span>
                            <span className="font-semibold text-gray-900 truncate">
                              {h.type === "recurring" ? h.day : h.date}
                            </span>
                          </div>
                          <div className="text-gray-600 truncate mt-0.5">
                            {h.reason || "Holiday"} • {h.class_id ? className(h.class_id) : "School-wide"}
                          </div>
                        </div>

                        <button
                          onClick={() => setDeleteHolidayTarget(h)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0"
                          title="Delete holiday"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mark Recurring Holiday */}
      <Modal
        open={!!holidayToggleDay}
        title={`Set Recurring Holiday — ${holidayToggleDay?.name}`}
        onClose={() => setHolidayToggleDay(null)}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Mark all <strong>{holidayToggleDay?.name}s</strong> as non-teaching days.
          </p>

          <div>
            <label className="label text-xs">Holiday Reason / Description</label>
            <input
              type="text"
              value={holidayReasonInput}
              onChange={(e) => setHolidayReasonInput(e.target.value)}
              placeholder="e.g. Saturday Off, Activity Day"
              className="input-field text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="holidayScopeSchoolWide"
              checked={holidayScopeSchoolWide}
              onChange={(e) => setHolidayScopeSchoolWide(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <label htmlFor="holidayScopeSchoolWide" className="text-xs text-gray-700">
              Apply to All Classes (School-wide)
            </label>
          </div>

          {!holidayScopeSchoolWide && selectedClassId && (
            <p className="text-xs text-primary-700 bg-primary-50 p-2.5 rounded border border-primary-200">
              This recurring holiday will apply to <strong>{className(selectedClassId)}</strong> only.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setHolidayToggleDay(null)}
              disabled={savingHoliday}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRecurringHoliday}
              disabled={savingHoliday}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {savingHoliday ? "Saving…" : "Save Holiday"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Remove Holiday Dialog */}
      <ConfirmDialog
        open={!!deleteHolidayTarget}
        title="Remove Holiday"
        message={`Are you sure you want to remove the ${deleteHolidayTarget?.type} holiday for "${
          deleteHolidayTarget?.type === "recurring"
            ? deleteHolidayTarget?.day
            : deleteHolidayTarget?.date
        }" (${deleteHolidayTarget?.reason || "Holiday"})?`}
        loading={deletingHoliday}
        onConfirm={handleDeleteHoliday}
        onCancel={() => setDeleteHolidayTarget(null)}
      />

      {/* Create / Edit Schedule Slot Modal */}
      <Modal
        open={open}
        title={editing ? "Edit Schedule Slot" : "New Schedule Slot"}
        onClose={() => setOpen(false)}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value === "" ? "" : Number(e.target.value))}
                className="input-field"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section || ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Day of Week *</label>
              <select
                value={formDayOfWeek}
                onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                className="input-field"
              >
                {DAYS.map((d) => (
                  <option key={d.index} value={d.index}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Subject *</label>
              <select
                value={formSubjectId}
                onChange={(e) => {
                  const newSubId = e.target.value === "" ? "" : Number(e.target.value);
                  setFormSubjectId(newSubId);
                }}
                className="input-field"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Teacher</label>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value === "" ? "" : Number(e.target.value))}
                className="input-field"
              >
                <option value="">Select teacher (optional)</option>
                {assignedTeachersForForm.length > 0 && (
                  <optgroup label="Assigned to this class/subject">
                    {assignedTeachersForForm.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name || `#${t.id}`}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="All Teachers">
                  {teachers
                    .filter((t) => !assignedTeachersForForm.some((at) => at.id === t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name || `#${t.id}`}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Timing and Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Start Time *</label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Room (Optional)</label>
              <input
                type="text"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="e.g. 101 or Lab A"
                className="input-field"
              />
            </div>
          </div>

          {/* Quick Period Buttons */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Quick Period Fill
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_PERIODS.filter((p) => !p.isLunch).map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setFormStartTime(p.start);
                    setFormEndTime(p.end);
                  }}
                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                    formStartTime === p.start && formEndTime === p.end
                      ? "bg-primary-100 text-primary-800 border-primary-300 font-semibold"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {p.label} ({p.start}-{p.end})
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Lunch Break:</strong> 12:00 PM – 1:00 PM is reserved. Overlapping slots are forbidden.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Schedule Slot"
        message={`Are you sure you want to remove this timetable slot?`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}