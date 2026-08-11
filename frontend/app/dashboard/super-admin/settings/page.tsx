"use client";

import { useState, useEffect } from "react";
import { Settings, Save, School, Sliders } from "lucide-react";
import api from "@/lib/api";

interface SchoolRecord {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  principal_name: string | null;
  established_year: number | null;
  logo_url: string | null;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  email: "",
  principal_name: "",
  established_year: "",
  logo_url: "",
};

export default function SuperAdminSettingsPage() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"school" | "system">("school");
  const [systemSettings, setSystemSettings] = useState<{ [key: string]: string }>({
    "DEFAULT_EXAM_MARKS": "100",
    "DEFAULT_ASSIGNMENT_MARKS": "30"
  });
  const [savingSystem, setSavingSystem] = useState(false);

  useEffect(() => {
    api.get("/schools/").then((res) => {
      setSchools(res.data);
      const first = res.data[0];
      if (first) {
        setForm({
          name: first.name || "",
          address: first.address || "",
          phone: first.phone || "",
          email: first.email || "",
          principal_name: first.principal_name || "",
          established_year: first.established_year != null ? String(first.established_year) : "",
          logo_url: first.logo_url || "",
        });
      }
    }).catch((err) => setError(err?.message || "Failed to load school"));

    api.get("/settings/").then((res) => {
      const settingsObj: any = { ...systemSettings };
      res.data.forEach((s: any) => {
        settingsObj[s.key] = s.value;
      });
      setSystemSettings(settingsObj);
    }).catch((err) => console.error("Failed to load settings")).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...form,
        established_year: form.established_year ? Number(form.established_year) : null,
        logo_url: form.logo_url || null,
      };
      if (schools.length > 0) {
        await api.put(`/schools/${schools[0].id}`, payload);
        setSuccess("School settings updated.");
      } else {
        await api.post("/schools/", { ...payload, is_active: true });
        setSuccess("School created.");
        setForm(emptyForm);
      }
      const res = await api.get("/schools/");
      setSchools(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Could not save school settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSystem(true);
    setSuccess(null);
    setError(null);
    try {
      await Promise.all([
        api.put("/settings/DEFAULT_EXAM_MARKS", { key: "DEFAULT_EXAM_MARKS", value: systemSettings.DEFAULT_EXAM_MARKS }),
        api.put("/settings/DEFAULT_ASSIGNMENT_MARKS", { key: "DEFAULT_ASSIGNMENT_MARKS", value: systemSettings.DEFAULT_ASSIGNMENT_MARKS })
      ]);
      setSuccess("System settings updated.");
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Could not save system settings");
    } finally {
      setSavingSystem(false);
    }
  };

  const field = (key: keyof typeof emptyForm, label: string, type = "text") => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="input"
      />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading settings…</div></div>
      ) : error && schools.length === 0 ? (
        <div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>
      ) : (
        <div className="card max-w-2xl">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("school")}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "school" ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <School className="h-4 w-4" />
                School Profile
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "system" ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Sliders className="h-4 w-4" />
                System Settings
              </button>
            </nav>
          </div>

          {success && <p className="text-green-700 text-sm mb-4">{success}</p>}
          {error && <p className="text-red-700 text-sm mb-4">{error}</p>}
          
          {activeTab === "school" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("name", "School Name")}
              {field("principal_name", "Principal Name")}
              {field("email", "Contact Email", "email")}
              {field("phone", "Contact Phone")}
              {field("established_year", "Established Year", "number")}
              {field("logo_url", "Logo URL")}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" rows={2} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving || !form.name} className="btn-primary">{saving ? "Saving…" : <span className="flex items-center gap-1"><Save className="h-4 w-4" />Save Profile</span>}</button>
            </div>
          </form>
          ) : (
          <form onSubmit={handleSaveSystemSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Exam Marks</label>
                <input
                  type="number"
                  value={systemSettings.DEFAULT_EXAM_MARKS}
                  onChange={(e) => setSystemSettings({ ...systemSettings, DEFAULT_EXAM_MARKS: e.target.value })}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Default total marks for Examinations.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Assignment Marks</label>
                <input
                  type="number"
                  value={systemSettings.DEFAULT_ASSIGNMENT_MARKS}
                  onChange={(e) => setSystemSettings({ ...systemSettings, DEFAULT_ASSIGNMENT_MARKS: e.target.value })}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Default total marks for Assignments.</p>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={savingSystem} className="btn-primary">{savingSystem ? "Saving…" : <span className="flex items-center gap-1"><Save className="h-4 w-4" />Save Settings</span>}</button>
            </div>
          </form>
          )}
        </div>
      )}
    </div>
  );
}
