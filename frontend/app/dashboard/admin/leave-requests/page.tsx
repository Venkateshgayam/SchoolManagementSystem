"use client";

import { useState, useEffect } from "react";
import { CalendarDays, ClipboardList, Check, X } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

interface LeaveRecord { id: number; student_id: number | null; teacher_id: number | null; from_date: string; to_date: string; reason: string | null; status: string; approved_by: number | null; remarks: string | null; created_at: string; }

export default function AdminLeaveRequestsPage() {
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
      const res = await api.put(`/leave-requests/${id}`, { status, remarks: remarks ?? undefined });
      setLeaves((p) => p.map((l) => (l.id === id ? { ...res.data, status, remarks } : l)));
    } catch (err: any) { alert(err?.response?.data?.detail || err?.message || "Could not update"); }
    finally { setUpdating(null); }
  };

  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading leave requests…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Review and decide on student and teacher leave requests" icon={CalendarDays} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Requests" value={leaves.length} icon={ClipboardList} />
        <StatCard title="Pending" value={pendingCount} icon={CalendarDays} />
        <StatCard title="Approved" value={leaves.filter((l) => l.status === "approved").length} icon={Check} />
      </div>
      {leaves.length === 0 ? (
        <div className="card text-center py-8"><CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No leave requests.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {l.teacher_id ? `Teacher #${l.teacher_id}` : `Student #${l.student_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(l.from_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(l.to_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><ClipboardList className="h-4 w-4 inline mr-1 text-gray-400" />{l.reason || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={l.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{l.remarks || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-1">
                      {l.status !== "approved" && (
                        <button disabled={updating === l.id} onClick={() => updateStatus(l.id, "approved")} className="text-xs px-2 py-0.5 rounded text-green-700 hover:bg-green-50"><Check className="h-3 w-3 inline mr-0.5" />Approve</button>
                      )}
                      {l.status !== "rejected" && (
                        <button disabled={updating === l.id} onClick={() => updateStatus(l.id, "rejected")} className="text-xs px-2 py-0.5 rounded text-red-700 hover:bg-red-50"><X className="h-3 w-3 inline mr-0.5" />Reject</button>
                      )}
                      {updating === l.id && <span className="text-xs text-gray-500">Saving…</span>}
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