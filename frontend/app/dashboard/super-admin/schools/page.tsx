"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Pencil } from "lucide-react";
import api from "@/lib/api";
import Modal from "@/components/dashboard/Modal";

interface SchoolRecord {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  principal_name: string | null;
  established_year: number | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  email: "",
  principal_name: "",
  established_year: "",
};

export default function SuperAdminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const res = await api.get("/schools/");
      setSchools(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: SchoolRecord) => {
    setEditing(s);
    setForm({
      name: s.name,
      address: s.address || "",
      phone: s.phone || "",
      email: s.email || "",
      principal_name: s.principal_name || "",
      established_year: s.established_year != null ? String(s.established_year) : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        established_year: form.established_year ? Number(form.established_year) : null,
      };
      if (editing) {
        await api.put(`/schools/${editing.id}`, payload);
      } else {
        await api.post("/schools/", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Could not save school");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4 inline mr-1" />Add School</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading schools…</div></div>
      ) : error ? (
        <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={load} className="btn-primary">Retry</button></div>
      ) : schools.length === 0 ? (
        <div className="card text-center py-8"><Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No schools found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schools.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.principal_name || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {s.email || "—"}{s.phone ? ` · ${s.phone}` : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.established_year || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800"><Pencil className="h-4 w-4 inline" /> Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{schools.length} school(s)</p>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? "Edit School" : "Add School"} onClose={() => setModalOpen(false)} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={255} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
              <input type="text" value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} maxLength={255} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Established Year</label>
              <input type="number" value={form.established_year} onChange={(e) => setForm({ ...form, established_year: e.target.value })} min={1800} max={2030} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !form.name} className="btn-primary">{saving ? "Saving…" : editing ? "Save Changes" : "Create School"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
