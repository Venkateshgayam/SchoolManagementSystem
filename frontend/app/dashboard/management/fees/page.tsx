"use client";

import { useState, useEffect } from "react";
import { Receipt, Calendar, CheckCircle, Save } from "lucide-react";
import api from "@/lib/api";

interface FeeRecord { id: number; student_id: number; amount: number; due_date: string | null; paid_date: string | null; status: string; academic_year: string | null; created_at: string; }

const STATUSES = ["unpaid", "paid", "partial", "overdue"];

export default function ManagementFeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingStatus, setSavingStatus] = useState<string>("");

  useEffect(() => {
    api.get("/fees/").then((res) => setFees(res.data)).catch((err) => setError(err?.message || "Failed to load fees")).finally(() => setLoading(false));
  }, []);

  const saveStatus = async (id: number, status: string) => {
    setSavingId(id); setSavingStatus(status);
    try {
      await api.put(`/fees/${id}`, { status, paid_date: status === "paid" ? new Date().toISOString().split("T")[0] : undefined });
      const updated = fees.map((f) => f.id === id ? { ...f, status, paid_date: status === "paid" ? new Date().toISOString().split("T")[0] : f.paid_date } : f);
      setFees(updated);
    } catch (err: any) { alert(err?.response?.data?.detail || err?.message || "Could not update fee"); }
    finally { setSavingId(null); setSavingStatus(""); }
  };

  const totalRevenue = fees.filter((f) => f.status === "paid").reduce((sum, f) => sum + f.amount, 0);
  const pending = fees.filter((f) => f.status !== "paid").reduce((sum, f) => sum + f.amount, 0);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading fees…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fees</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500">Collected Revenue</p>
          <p className="text-2xl font-bold text-green-700">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Pending Amount</p>
          <p className="text-2xl font-bold text-red-700">${pending.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-900">{fees.length}</p>
        </div>
      </div>
      {fees.length === 0 ? (
        <div className="card text-center py-8"><Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No fee records found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fees.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((f) => (
                  <tr key={f.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{f.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${f.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{f.due_date ? new Date(f.due_date).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{f.paid_date ? <><CheckCircle className="h-4 w-4 inline mr-1 text-green-500" />{new Date(f.paid_date).toLocaleDateString()}</> : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={f.status}
                        disabled={savingId === f.id}
                        onChange={(e) => saveStatus(f.id, e.target.value)}
                        className="input w-32"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{savingId === f.id && savingStatus ? `Saving…` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{fees.length} fee record(s)</p>
        </div>
      )}
    </div>
  );
}
