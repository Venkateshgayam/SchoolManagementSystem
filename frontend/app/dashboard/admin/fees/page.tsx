"use client";

import { useState, useEffect } from "react";
import { Receipt, Calendar, CheckCircle, Wallet, Clock3 } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

interface FeeRecord { id: number; student_id: number; amount: number; due_date: string | null; paid_date: string | null; status: string; academic_year: string | null; created_at: string; }

const STATUSES = ["unpaid", "paid", "partial", "overdue"];

export default function AdminFeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    api.get("/fees/").then((res) => setFees(res.data)).catch((err) => setError(err?.message || "Failed to load fees")).finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter === "all" ? fees : fees.filter((f) => f.status === statusFilter);
  const totalRevenue = fees.filter((f) => f.status === "paid").reduce((sum, f) => sum + f.amount, 0);
  const pending = fees.filter((f) => f.status !== "paid").reduce((sum, f) => sum + f.amount, 0);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading fees…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader title="Fees" subtitle="Fee records and collection summary" icon={Receipt} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Collected Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={Wallet} />
        <StatCard title="Pending Amount" value={`$${pending.toFixed(2)}`} icon={Clock3} />
        <StatCard title="Total Records" value={fees.length} icon={Receipt} />
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-48">
          <option value="all">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academic Year</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((f) => (
                  <tr key={f.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{f.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${f.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{f.due_date ? new Date(f.due_date).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{f.paid_date ? <><CheckCircle className="h-4 w-4 inline mr-1 text-green-500" />{new Date(f.paid_date).toLocaleDateString()}</> : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={f.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{f.academic_year || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{filtered.length} fee record(s)</p>
        </div>
      )}
    </div>
  );
}