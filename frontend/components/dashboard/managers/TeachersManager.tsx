"use client";

import { useState, useEffect, useMemo } from "react";
import { UserCheck, Plus, Save, Search, Award, Calendar, Pencil, Trash2, Mail, Briefcase, Users, Eye, BookOpen, GraduationCap, X } from "lucide-react";
import { formatTeacherNameId, formatDate } from "@/lib/formatters";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import PageLoader from "@/components/dashboard/PageLoader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PasswordInput from "@/components/ui/PasswordInput";
import { can } from "@/lib/permissions";

interface TeacherRecord {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  username: string | null;
  qualification: string | null;
  experience_years: number | null;
  employment_date: string;
  status: string;
}

interface TeacherAssignment {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number | null;
  teacher_name?: string | null;
  class_name?: string | null;
  class_section?: string | null;
  subject_name?: string | null;
}

interface FormState {
  full_name: string;
  email: string;
  username: string;
  qualification: string;
  experience_years: string;
  employment_date: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  username: "",
  qualification: "",
  experience_years: "",
  employment_date: "",
  status: "active",
};

export default function TeachersManager() {
  const [perm, setPerm] = useState({ create: false, update: false, del: false });
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string; teacher_ids: number[] }[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string; section: string; teacher_id: number }[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRecord | null>(null);
  const [viewDetailsTarget, setViewDetailsTarget] = useState<TeacherRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [assignmentTarget, setAssignmentTarget] = useState<TeacherRecord | null>(null);
  const [assignClassId, setAssignClassId] = useState<number | "">("");
  const [assignSubjectId, setAssignSubjectId] = useState<number | "">("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setPerm({ create: can("teacher:create"), update: can("teacher:update"), del: can("teacher:delete") });
  }, []);

  const fetchData = async () => {
    const [resTeachers, resSubjects, resClasses, resAssignments] = await Promise.all([
      api.get("/teachers/").catch(() => ({ data: [] })),
      api.get("/subjects/").catch(() => ({ data: [] })),
      api.get("/classes/").catch(() => ({ data: [] })),
      api.get("/teacher-class-assignments/").catch(() => ({ data: [] })),
    ]);
    setTeachers(resTeachers.data);
    setSubjects(resSubjects.data);
    setClasses(resClasses.data);
    setAssignments(resAssignments.data);
  };

  useEffect(() => {
    fetchData()
      .catch((err: any) => setError(err?.message || "Failed to load teachers"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      (t) =>
        (t.full_name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.qualification || "").toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (teacher: TeacherRecord) => {
    setEditing(teacher);
    setForm({
      full_name: teacher.full_name || "",
      email: teacher.email || "",
      username: teacher.username || "",
      qualification: teacher.qualification || "",
      experience_years: teacher.experience_years?.toString() ?? "",
      employment_date: teacher.employment_date ? teacher.employment_date.slice(0, 10) : "",
      status: teacher.status,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!editing && !form.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!editing && !form.username.trim()) {
      toast.error("Username is required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/teachers/${editing.id}`, {
          full_name: form.full_name,
          qualification: form.qualification || null,
          experience_years: form.experience_years ? parseInt(form.experience_years, 10) : null,
          employment_date: form.employment_date ? `${form.employment_date}T00:00:00Z` : null,
          status: form.status,
        });
        toast.success("Teacher updated successfully.");
      } else {
        await api.post("/teachers/", {
          full_name: form.full_name,
          email: form.email,
          username: form.username,
          qualification: form.qualification || null,
          experience_years: form.experience_years ? parseInt(form.experience_years, 10) : null,
          employment_date: form.employment_date ? `${form.employment_date}T00:00:00Z` : null,
          status: form.status,
        });
        toast.success("Teacher created successfully.");
      }
      setOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save teacher.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/teachers/${deleteTarget.id}`);
      toast.success("Teacher deleted successfully.");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete teacher.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!assignmentTarget) return;
    if (!assignClassId) {
      toast.error("Please select a class.");
      return;
    }

    setAssigning(true);
    try {
      await api.post("/teacher-class-assignments/", {
        teacher_id: assignmentTarget.id,
        class_id: Number(assignClassId),
        subject_id: assignSubjectId !== "" ? Number(assignSubjectId) : null,
      });
      toast.success("Class assigned successfully.");
      setAssignClassId("");
      setAssignSubjectId("");
      const res = await api.get("/teacher-class-assignments/");
      setAssignments(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create assignment.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    try {
      await api.delete(`/teacher-class-assignments/${assignmentId}`);
      toast.success("Assignment removed.");
      const res = await api.get("/teacher-class-assignments/");
      setAssignments(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to remove assignment.");
    }
  };

  if (loading) return <PageLoader label="Loading teachers..." />;
  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle="Manage teaching staff and class assignments"
        icon={UserCheck}
        action={
          perm.create ? (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Teacher
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Total Teachers</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{teachers.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Active Staff</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {teachers.filter((t) => t.status === "active").length}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Class Assignments</p>
          <p className="mt-2 text-3xl font-bold text-primary-600">{assignments.length}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teachers…"
            className="input-field pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No teachers found.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Homeroom Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Classes & Subjects</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((t) => {
                  const teacherAssignments = assignments.filter((a) => a.teacher_id === t.id);
                  const homeroomClass = classes.find((c) => c.teacher_id === t.id);

                  return (
                    <tr key={t.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        TCH-{String(t.id).padStart(3, "0")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {t.full_name || "N/A"}
                        <div className="text-xs text-gray-500 font-normal">{t.qualification || t.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {homeroomClass ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {homeroomClass.name} {homeroomClass.section || ""}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        {teacherAssignments.length === 0 ? (
                          <span className="text-gray-400 italic text-xs">No classes assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {teacherAssignments.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200"
                              >
                                <span className="font-semibold">{a.class_name} {a.class_section || ""}</span>
                                {a.subject_name && <span className="text-blue-500">({a.subject_name})</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAssignmentTarget(t);
                              setAssignClassId("");
                              setAssignSubjectId("");
                            }}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 rounded-md transition-colors border border-emerald-200 inline-flex items-center justify-center gap-1 text-xs font-medium px-2.5"
                            title="Manage Class Assignments"
                          >
                            <GraduationCap className="h-4 w-4" />
                            <span>Assign Classes</span>
                          </button>
                          <button
                            onClick={() => setViewDetailsTarget(t)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors border border-blue-200 inline-flex items-center justify-center"
                            title="View teacher profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {perm.update && (
                            <button
                              onClick={() => openEdit(t)}
                              className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 rounded-md transition-colors border border-amber-200 inline-flex items-center justify-center"
                              title="Edit Teacher"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {perm.del && (
                            <button
                              onClick={() => setDeleteTarget(t)}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-md transition-colors border border-red-200 inline-flex items-center justify-center"
                              title="Delete Teacher"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{teachers.length} teacher(s)</p>
        </div>
      )}

      <Modal open={open} title={editing ? "Edit Teacher" : "New Teacher"} onClose={() => setOpen(false)} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. John Smith" className="input-field" />
            </div>
            <div>
              <label className="label">Qualification</label>
              <input type="text" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. M.Sc. Mathematics, B.Ed." className="input-field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} placeholder="teacher@example.com" className="input-field disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
            <div>
              <label className="label">Username</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} placeholder="e.g. john.smith" className="input-field disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
            <div>
              <label className="label">Experience (years)</label>
              <input type="number" min={0} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} placeholder="e.g. 5" className="input-field" />
            </div>
            <div>
              <label className="label">Employment Date</label>
              <input type="date" value={form.employment_date} onChange={(e) => setForm({ ...form, employment_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!assignmentTarget} title={`Assign Classes — ${assignmentTarget?.full_name || "Teacher"}`} onClose={() => setAssignmentTarget(null)} maxWidth="max-w-2xl">
        {assignmentTarget && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">Assign this teacher to the classes and subjects they teach.</p>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Class Assignments</h3>
              {(() => {
                const teacherAssignments = assignments.filter((a) => a.teacher_id === assignmentTarget.id);
                if (teacherAssignments.length === 0) {
                  return <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500 text-center">No classes currently assigned to this teacher.</div>;
                }
                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {teacherAssignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md shadow-xs hover:border-gray-300">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{a.class_name} {a.class_section || ""}</p>
                          <p className="text-xs text-gray-500">Subject: <span className="font-medium text-primary-700">{a.subject_name || "All / General"}</span></p>
                        </div>
                        <button onClick={() => handleRemoveAssignment(a.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove assignment"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Add New Class Assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Class *</label>
                  <select value={assignClassId} onChange={(e) => setAssignClassId(e.target.value === "" ? "" : Number(e.target.value))} className="input-field">
                    <option value="">Select class</option>
                    {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name} {cls.section || ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Subject (Optional)</label>
                  <select value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value === "" ? "" : Number(e.target.value))} className="input-field">
                    <option value="">Select subject (or all)</option>
                    {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={handleAddAssignment} disabled={assigning || !assignClassId} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> {assigning ? "Assigning…" : "Assign Class"}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button onClick={() => setAssignmentTarget(null)} className="btn-secondary">Done</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!viewDetailsTarget} title="Teacher Details" onClose={() => setViewDetailsTarget(null)}>
        {viewDetailsTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Teacher ID</p><p className="font-medium">TCH-{String(viewDetailsTarget.id).padStart(3, "0")}</p></div>
              <div><p className="text-sm text-gray-500">Name</p><p className="font-medium">{viewDetailsTarget.full_name || "N/A"}</p></div>
              <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{viewDetailsTarget.email || "N/A"}</p></div>
              <div><p className="text-sm text-gray-500">Username</p><p className="font-medium">{viewDetailsTarget.username || "N/A"}</p></div>
              <div><p className="text-sm text-gray-500">Status</p><div className="mt-1"><StatusBadge status={viewDetailsTarget.status} /></div></div>
              <div><p className="text-sm text-gray-500">Qualification</p><p className="font-medium">{viewDetailsTarget.qualification || "N/A"}</p></div>
              <div><p className="text-sm text-gray-500">Experience</p><p className="font-medium">{viewDetailsTarget.experience_years ?? "—"} yr(s)</p></div>
              <div><p className="text-sm text-gray-500">Employment Date</p><p className="font-medium">{viewDetailsTarget.employment_date ? formatDate(viewDetailsTarget.employment_date) : "N/A"}</p></div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">Assigned Classes & Subjects</p>
                {(() => {
                  const teacherAssignments = assignments.filter((a) => a.teacher_id === viewDetailsTarget.id);
                  return teacherAssignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacherAssignments.map((a) => (
                        <span key={a.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100 font-medium">{a.class_name} {a.class_section || ""} {a.subject_name ? `(${a.subject_name})` : ""}</span>
                      ))}
                    </div>
                  ) : <p className="text-sm italic text-gray-400">No classes assigned</p>;
                })()}
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">Homeroom Role (Class Teacher)</p>
                {(() => {
                  const homeroomClass = classes.find((c) => c.teacher_id === viewDetailsTarget.id);
                  return homeroomClass ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-md border border-emerald-100 font-medium">{homeroomClass.name} {homeroomClass.section || ""}</span>
                  ) : <p className="text-sm italic text-gray-400">—</p>;
                })()}
              </div>
            </div>
            <div className="flex justify-end pt-4"><button onClick={() => setViewDetailsTarget(null)} className="btn-secondary">Close</button></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Teacher"
        message={`Delete ${deleteTarget?.full_name || `teacher #${deleteTarget?.id}`}? This will also remove their login account and cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
