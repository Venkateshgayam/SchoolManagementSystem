"use client";

import { useState } from "react";
import { KeyRound, Save } from "lucide-react";
import api from "@/lib/api";

export default function SuperAdminChangePasswordPage() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (form.new_password !== form.confirm) { setError("New passwords do not match"); return; }
    if (form.new_password.length < 6) { setError("New password must be at least 6 characters"); return; }
    setSubmitting(true);
    try {
      await api.put("/auth/change-password", { current_password: form.current_password, new_password: form.new_password });
      setSuccess(true);
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Could not change password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h1>
      <div className="card max-w-lg">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-800">Update your password</h2>
        </div>
        {success && <p className="text-green-700 text-sm mb-4">Password changed successfully.</p>}
        {error && <p className="text-red-700 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} required minLength={6} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required className="input" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Saving…" : <span className="flex items-center gap-1"><Save className="h-4 w-4" />Change Password</span>}</button>
          </div>
        </form>
      </div>
    </div>
  );
}