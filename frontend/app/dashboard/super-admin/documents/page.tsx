"use client";

import { useState, useEffect } from "react";
import { FileText, Trash2, Upload, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";

interface DocumentRecord {
  id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  document_type: string | null;
  uploaded_by: number | null;
  student_id: number | null;
  created_at: string;
}

const DOCUMENT_TYPES = ["general", "admission", "report", "certificate", "fee"];

export default function SuperAdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DocumentRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", file_url: "", document_type: "general" });

  const load = async () => {
    try {
      const res = await api.get("/documents/");
      setDocuments(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/documents/", {
        ...form,
        file_url: form.file_url || null,
        description: form.description || null,
      });
      setForm({ title: "", description: "", file_url: "", document_type: "general" });
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not upload document");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.delete(`/documents/${confirmDelete.id}`);
      setDocuments((p) => p.filter((d) => d.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documents</h1>
      <div className="card mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Upload Document</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={255} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="input">
                {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
              <input type="url" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} className="input" placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !form.title} className="btn-primary">{saving ? "Uploading…" : <span className="flex items-center gap-1"><Upload className="h-4 w-4" />Upload</span>}</button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading documents…</div></div>
      ) : error ? (
        <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={load} className="btn-primary">Retry</button></div>
      ) : documents.length === 0 ? (
        <div className="card text-center py-8"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No documents found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((d) => (
                  <tr key={d.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {d.file_url
                        ? <a href={d.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">{d.title} <ExternalLink className="h-3 w-3" /></a>
                        : d.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{d.document_type || "general"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">{d.description || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => setConfirmDelete(d)} className="text-xs text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4 inline" /> Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{documents.length} document(s)</p>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Document"
        message={`Delete "${confirmDelete?.title}"? This cannot be undone.`}
        loading={deletingId !== null}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
