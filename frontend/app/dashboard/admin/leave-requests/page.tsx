"use client";

import { useState, useEffect } from "react";
import { CalendarDays, ClipboardList, Check, X, Loader2 } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Modal from "@/components/dashboard/Modal";
import {   formatStudentNameId, formatTeacherNameId , formatDate } from "@/lib/formatters";
import toast from "react-hot-toast";

interface LeaveRecord { id: number; student_id: number | null; teacher_id: number | null; from_date: string; to_date: string; reason: string | null; status: string; approved_by: number | null; remarks: string | null; created_at: string; exceeds_limit?: boolean; }

export default function AdminLeaveRequestsPage() {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [actionModal, setActionModal] = useState<{ open: boolean; id: number | null; status: string; remarks: string }>({ open: false, id: null, status: "", remarks: "" });

  useEffect(() => {
    async function fetchData() {
      try {
        const [leavesRes, studentsRes, teachersRes] = await Promise.all([
          api.get("/leave-requests/"),
          api.get("/students/"),
          api.get("/teachers/")
        ]);
        setLeaves(leavesRes.data);
        setStudents(studentsRes.data);
        setTeachers(teachersRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const confirmUpdateStatus = async () => {
    if (!actionModal.id || !actionModal.status) return;
    setUpdating(actionModal.id);
    setActionModal({ ...actionModal, open: false });
    
    try {
      const res = await api.put(`/leave-requests/${actionModal.id}`, { 
        status: actionModal.status, 
        remarks: actionModal.remarks || undefined 
      });
      setLeaves((p) => p.map((l) => (l.id === actionModal.id ? { ...res.data, status: actionModal.status, remarks: actionModal.remarks || undefined } : l)));
    } catch (err: any) { 
      toast.error(err?.response?.data?.detail || err?.message || "Could not update"); 
    } finally { 
      setUpdating(null); 
    }
  };

  const getRequesterName = (l: LeaveRecord) => {
    if (l.teacher_id) {
      const t = teachers.find(t => t.id === l.teacher_id);
      return formatTeacherNameId(t?.full_name, l.teacher_id);
    }
    const s = students.find(s => s.id === l.student_id);
    return formatStudentNameId(s?.full_name, l.student_id, s?.roll_number);
  };

  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading leave requests…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Review and decide on student and teacher leave requests" icon={CalendarDays} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pending" value={pendingCount} icon={ClipboardList} />
        <StatCard title="Approved" value={leaves.filter((l) => l.status === "APPROVED").length} icon={Check} />
        <StatCard title="Rejected" value={leaves.filter((l) => l.status === "REJECTED").length} icon={X} />
      </div>

      {leaves.length === 0 ? (
        <div className="card text-center py-8"><CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No leave requests found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.slice().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getRequesterName(l)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(l.from_date)} - {formatDate(l.to_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <ClipboardList className="h-4 w-4 inline mr-1 text-gray-400" />{l.reason || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={l.status} />
                      {l.exceeds_limit && (
                        <div className="mt-1">
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-800">
                            Exceeds Limit
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={l.remarks || ""}>
                      {l.remarks || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      {l.status === "PENDING" && (
                        <>
                          <button
                            disabled={updating === l.id}
                            onClick={() => setActionModal({ open: true, id: l.id, status: "APPROVED", remarks: "" })}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {updating === l.id && actionModal.status === "APPROVED" ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1" />
                            )}
                            Approve
                          </button>
                          <button
                            disabled={updating === l.id}
                            onClick={() => setActionModal({ open: true, id: l.id, status: "REJECTED", remarks: "" })}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {updating === l.id && actionModal.status === "REJECTED" ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5 mr-1" />
                            )}
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{leaves.length} request(s)</p>
        </div>
      )}
      
      <Modal 
        open={actionModal.open} 
        title={actionModal.status === "APPROVED" ? "Approve Request" : "Reject Request"} 
        onClose={() => setActionModal({ ...actionModal, open: false })}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">You are about to {actionModal.status} this leave request.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={actionModal.remarks}
              onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
              placeholder="Add any remarks for the requester..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setActionModal({ ...actionModal, open: false })} className="btn-secondary">Cancel</button>
            <button 
              onClick={confirmUpdateStatus}
              disabled={updating !== null} 
              className={`btn-primary flex items-center justify-center ${actionModal.status === "REJECTED" ? "bg-red-600 hover:bg-red-700" : ""} disabled:opacity-50`}
            >
              {updating !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm {actionModal.status === "APPROVED" ? "Approval" : "Rejection"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}