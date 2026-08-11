"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import PasswordInput from "@/components/ui/PasswordInput";

export default function AdminChangePasswordPage() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(false);
    if (form.new_password !== form.confirm) { setError("New passwords do not match"); return; }
    if (form.new_password.length < 6) { setError("New password must be at least 6 characters"); return; }
    setSubmitting(true);
    try {
      await api.put("/auth/change-password", { current_password: form.current_password, new_password: form.new_password });
      setSuccess(true);
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err: any) { setError(err?.response?.data?.detail || err?.message || "Could not change password"); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <PageHeader title="Change Password" subtitle="Update your account password" icon={Lock} />
      <div className="card max-w-lg">
        {success && <p className="text-green-700 text-sm mb-4">Password changed successfully.</p>}
        {error && <p className="text-red-700 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="current_password"
            label="Current Password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            required
          />
          <PasswordInput
            id="new_password"
            label="New Password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            required
            minLength={6}
          />
          <PasswordInput
            id="confirm"
            label="Confirm New Password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
          />
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Saving…" : "Change Password"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}