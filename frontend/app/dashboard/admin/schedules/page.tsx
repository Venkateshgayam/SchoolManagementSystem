"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Clock, UserCheck, Plus, Save, Pencil, Trash2, Calendar, MapPin, AlertCircle, LayoutGrid, List as ListIcon, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
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

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [formClassId, setFormClassId] = useState<number | "">("");
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(0);
  const [formSubjectId, setFormSubjectId] = useState<number | "">("");
  const [formTeacherId, setFormTeacherId] = useState<number | "">("");
  const [formRoom, setFormRoom] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");

  const { settings } = useSettings();

  const fetchData = async () => {
    try {
      const [s, c, sub, t, a] = await Promise.all([
        api.get("/schedules/").catch(() => ({ data: [] })),
        api.get("/classes/").catch(() => ({ data: [] })),
        api.get("/subjects/").catch(() => ({ data: [] })),
        api.get("/teachers/").catch(() => ({ data: [] })),
        api.get("/teacher-class-assignments/").catch(() => ({ data: [] })),
      ]);
      setSchedules(s.data);
      setClasses(c.data);
      setSubjects(sub.data);
      setTeachers(t.data);
      setAssignments(a.data);

      if (c.data.length > 0 && selectedClassId === null) {
        setSelectedClassId(c.data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      toast.error(err?.response?.data?.detail || "Failed to save schedule.");
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
      toast.error(err?.response?.data?.detail || "Failed to delete schedule.");
    } finally {
      setDeleting(false);
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

  return (
    <div>
      <PageHeader
        title="Schedules & Timetable"
        subtitle="Manage weekly class timetables, periods, and room assignments"
        icon={BookOpen}
        action={
          <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Schedule Slot
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Slots" value={schedules.length} icon={Clock} />
        <StatCard title="Classes Configured" value={new Set(schedules.map((s) => s.class_id)).size} icon={BookOpen} />
        <StatCard title="Subjects Covered" value={new Set(schedules.map((s) => s.subject_id)).size} icon={UserCheck} />
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

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "grid"
                ? "bg-white text-primary-700 shadow-xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Weekly Grid
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
        </div>
      </div>

      {/* Weekly Grid View */}
      {viewMode === "grid" && (
        <div className="card overflow-x-auto">
          <div className="min-w-[900px]">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100/80">
                  <th className="border border-gray-200 p-3 text-left text-xs font-bold text-gray-600 uppercase w-32">
                    Time / Period
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day.index}
                      className="border border-gray-200 p-3 text-center text-xs font-bold text-gray-700 uppercase"
                    >
                      {day.name}
                    </th>
                  ))}
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
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="card">
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
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {DAYS[s.day_of_week]?.name || `#${s.day_of_week}`}
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
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{currentClassSchedules.length} schedule slot(s)</p>
        </div>
      )}

      {/* Create / Edit Modal */}
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