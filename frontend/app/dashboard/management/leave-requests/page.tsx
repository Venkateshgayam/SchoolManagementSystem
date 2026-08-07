"use client";

import { useState, useEffect } from "react";
import { CalendarDays, ClipboardList, Save } from "lucide-react";
import api from "@/lib/api";

interface LeaveRecord { id: number; student_id: number; from_date: string; to_date: string; reason: string | null; status: string; approved_by: number | null; remarks: string | null; created_at: string; }

const STATUSES = ["pending", "approved", "rejected"];

export default function ManagementLeaveRequestsPage() {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    api.get("/leave-requests/").then((res) => setLeaves(res.data)).catch((err) => setError(err?.message || "Failed to load leave requests")).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    const remarks = prompt("Remarks (optional)", "") || undefined;
    setUpdating(id);
    try {
      const res = await api.put(`/leave-requests/${id}`, { status, remarks: remarks ?? undefined, approved_by: status === "approved" ? 0 : undefined });
      setLeaves((p) => p.map((l) => (l.id === id ? { ...res.data, ...{ status, remarks, approved_by: status === "approved" ? 0 : l.approved_by } } : l)));
    } catch (err: any) { alert(err?.response?.data?.detail || err?.message || "Could not update"); }
    finally { setUpdating(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading leave requests…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leave Requests</h1>
      {leaves.length === 0 ? (
        <div className="card text-center py-8"><CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No leave requests.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" />
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((l) => (
                  <tr key={l.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{l.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(l.from_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(l.to_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><ClipboardList className="h-4 w-4 inline mr-1 text-gray-400" />{l.reason || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${l.status === "approved" ? "bg-green-100 text-green-800" : l.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{l.status}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{l.remarks || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-1">
                      {STATUSES.map((s) => (
                        <button key={s} disabled={updating === l.id || l.status === s} onClick={() => updateStatus(l.id, s)} className={`text-xs px-2 py-0.5 rounded ${s === "approved" ? "text-green-700 hover:bg-green-50" : s === "rejected" ? "text-red-700 hover:bg-red-50" : "text-yellow-700 hover:bg-yellow-50"}`}>{s}</button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{leaves.length} request(s)</p>
        </div>
      )}
    </div>
  );
}
