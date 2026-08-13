"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Save, Download, Trash2, Calendar, File, Link2 } from "lucide-react";
import {   formatStudentNameId , formatDate } from "@/lib/formatters";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";

interface DocumentRecord { id: number; title: string; description: string | null; file_url: string | null; document_type: string | null; uploaded_by: number | null; student_id: number | null; created_at: string; }
interface StudentRecord { id: number; roll_number: string | null; full_name?: string; }

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", file_url: "", document_type: "", student_id: "" });

  const load = async () => {
    try {
      const [d, s] = await Promise.all([
        api.get("/documents/").catch(() => ({ data: [] })),
        api.get("/students/").catch(() => ({ data: [] })),
      ]);
      setDocuments(d.data); setStudents(s.data);
    } catch (err: any) { setError(err?.message || "Failed to load documents"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const studentLabel = (id: number | null) => {
    if (!id) return "—";
    const s = students.find((st) => st.id === id);
    if (!s) return `#${id}`;
    return formatStudentNameId(s.full_name, s.id, s.roll_number);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/documents/", {
        title: form.title,
        description: form.description || null,
        file_url: form.file_url || null,
        document_type: form.document_type || null,
        student_id: form.student_id ? Number(form.student_id) : null,
      });
      setModalOpen(false);
      setForm({ title: "", description: "", file_url: "", document_type: "", student_id: "" });
      await load();
    } catch (err: any) { toast.error(err?.response?.data?.detail || err?.message || "Could not create document"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/documents/${deleting.id}`);
      setDocuments((p) => p.filter((d) => d.id !== deleting.id));
      setDeleting(null);
    } catch (err: any) { toast.error(err?.response?.data?.detail || err?.message || "Could not delete document"); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading documents…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="School documents with download links"
        icon={FileText}
        action={<button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-1"><Plus className="h-4 w-4" /> Add Document</button>}
      />
      {documents.length === 0 ? (
        <div className="card text-center py-8"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No documents found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((d) => (
                  <tr key={d.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><FileText className="h-4 w-4 inline mr-1 text-gray-400" />{d.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{d.document_type || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{studentLabel(d.student_id)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{formatDate(d.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{d.file_url ? <a href={d.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1"><Link2 className="h-3 w-3" />Open</a> : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => setDeleting(d)} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{documents.length} document(s)</p>
        </div>
      )}

      <Modal open={modalOpen} title="Add Document" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={255} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
            <input type="url" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://…" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <input type="text" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} maxLength={50} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student (optional)</label>
              <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="input">
                <option value="">None</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || `#${s.id}`} {s.roll_number ? `(${s.roll_number})` : ""}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !form.title} className="btn-primary">{saving ? "Saving…" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete document"
        message={`Are you sure you want to delete "${deleting?.title}"? This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}