"use client";

import { useState, useEffect } from "react";
import { Receipt, Calendar, CheckCircle, Wallet, Clock3, Percent, Plus, Save, Bell, Pencil, Trash2 } from "lucide-react";
import {   formatStudentNameId , formatDate } from "@/lib/formatters";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import PageLoader from "@/components/dashboard/PageLoader";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import toast from "react-hot-toast";
import { can } from "@/lib/permissions";
import { useSettings } from "@/hooks/useSettings";

interface FeeRecord { id: number; student_id: number; student_user_id: number | null; total_fee: number; amount_due: number; amount_paid: number; waiver_percentage: number; due_date: string | null; paid_date: string | null; status: string; academic_year: string | null; created_at: string; }

const STATUSES = ["unpaid", "paid", "partial", "overdue"];

export default function FeesManager() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [studentsList, setStudentsList] = useState<{ id: number; full_name?: string; roll_number?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { settings } = useSettings();
  const currencySymbol = settings.currency_symbol || "$";
  
  const formatCurrency = (amount: number) => `${currencySymbol}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [open, setOpen] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newFee, setNewFee] = useState<{ student_id: number | null; waiver_percentage: string; due_date: string; academic_year: string }>({ student_id: null, waiver_percentage: "", due_date: "", academic_year: "" });

  const [editOpen, setEditOpen] = useState(false);
  const [editFeeId, setEditFeeId] = useState<number | null>(null);
  const [editFeeData, setEditFeeData] = useState<{ waiver_percentage: string; due_date: string }>({ waiver_percentage: "", due_date: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [savingId, setSavingId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  const [deleteTarget, setDeleteTarget] = useState<FeeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/fees/"),
      can("fee:create") ? api.get("/students/").catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
    ])
      .then(([resFees, resStudents]) => {
        setFees(resFees.data);
        if (resStudents.data) setStudentsList(resStudents.data);
      })
      .catch((err) => setError(err?.message || "Failed to load fees"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newFee.student_id) return toast.error("Select a student");
    if (newFee.waiver_percentage && (Number.isNaN(Number(newFee.waiver_percentage)) || Number(newFee.waiver_percentage) < 0 || Number(newFee.waiver_percentage) > 100)) return toast.error("Enter a valid waiver percentage (0-100)");
    
    setSavingNew(true);
    try {
      const body = { 
        student_id: newFee.student_id, 
        waiver_percentage: newFee.waiver_percentage ? Number(newFee.waiver_percentage) : 0, 
        due_date: newFee.due_date || null, 
        academic_year: settings.current_academic_year || "2026-27" 
      };
      const res = await api.post("/fees/", body);
      setFees([res.data, ...fees]);
      setOpen(false);
      setNewFee({ student_id: null, waiver_percentage: "", due_date: "", academic_year: "" });
      toast.success("Fee record created");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create fee");
    } finally {
      setSavingNew(false);
    }
  };

  const recordPayment = async (f: FeeRecord) => {
    const pAmt = Number(paymentAmount);
    if (!paymentAmount || Number.isNaN(pAmt) || pAmt <= 0) return toast.error("Enter a valid payment amount");
    if (pAmt > f.amount_due) return toast.error("Payment cannot exceed the remaining balance");

    setSavingId(f.id);
    try {
      await api.put(`/fees/${f.id}`, { payment_amount: pAmt, paid_date: new Date().toISOString().split("T")[0] });
      const res = await api.get(`/fees/${f.id}`);
      setFees(fees.map((record) => record.id === f.id ? res.data : record));
      setPaymentAmount("");
      toast.success("Payment recorded");
    } catch (err: any) { 
      toast.error(err?.response?.data?.detail || err?.message || "Could not record payment"); 
    } finally { 
      setSavingId(null); 
    }
  };

  const handleEditSave = async () => {
    if (!editFeeId) return;
    setSavingEdit(true);
    try {
      const payload: any = {};
      if (editFeeData.waiver_percentage) payload.waiver_percentage = Number(editFeeData.waiver_percentage);
      if (editFeeData.due_date) payload.due_date = editFeeData.due_date;
      
      const res = await api.put(`/fees/${editFeeId}`, payload);
      setFees(fees.map((record) => record.id === editFeeId ? res.data : record));
      setEditOpen(false);
      toast.success("Fee record updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update fee");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/fees/${deleteTarget.id}`);
      setFees(fees.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Fee record deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete fee record");
    } finally {
      setDeleting(false);
    }
  };

  const sendReminder = async (f: FeeRecord) => {
    if (!f.student_user_id) return toast.error("Student has no linked user account.");
    try {
      await api.post("/notifications/", {
        user_id: f.student_user_id,
        title: "Fee Payment Reminder",
        message: `This is a reminder regarding your pending fee balance of ${formatCurrency(f.amount_due)}. Please ensure payment is made by ${f.due_date ? formatDate(f.due_date) : 'the required deadline'}.`,
        type: "fee_reminder"
      });
      toast.success("Reminder sent!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to send reminder");
    }
  };

  const filtered = statusFilter === "all" ? fees : fees.filter((f) => f.status === statusFilter);
  const totalRevenue = fees.reduce((sum, f) => sum + f.amount_paid, 0);
  const expectedRevenue = fees.reduce((sum, f) => sum + (f.total_fee || 0), 0);
  const pending = fees.reduce((sum, f) => sum + (f.amount_due), 0);
  const collectionRate = expectedRevenue > 0 ? ((totalRevenue / expectedRevenue) * 100).toFixed(1) : "0.0";

  if (loading) return <PageLoader label="Loading..." />;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <PageHeader 
        title="Fees" 
        subtitle="Fee records and collection summary" 
        icon={Receipt} 
        action={
          can("fee:create") ? (
            <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Fee Record
            </button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Collected Revenue" value={formatCurrency(totalRevenue)} icon={Wallet} />
        <StatCard title="Pending Amount" value={formatCurrency(pending)} icon={Clock3} />
        <StatCard title="Collection Rate" value={`${collectionRate}%`} icon={Percent} />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                {can("fee:update") && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>}
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((f) => {
                  const s = studentsList.find(st => st.id === f.student_id);
                  return (
                  <tr key={f.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatStudentNameId(s?.full_name, f.student_id, s?.roll_number)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(f.total_fee || 0)}
                      {(f as any).late_fee_applied > 0 && <div className="text-xs text-red-500 mt-0.5">Includes {formatCurrency((f as any).late_fee_applied)} late fee</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(f.amount_due)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(f.amount_paid)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{f.total_fee > 0 ? ((f.amount_paid / f.total_fee) * 100).toFixed(0) : 0}%</span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-600 rounded-full" style={{ width: `${Math.min(100, f.total_fee > 0 ? (f.amount_paid / f.total_fee) * 100 : 0)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Calendar className="h-4 w-4 inline mr-1 text-gray-400" />{f.due_date ? formatDate(f.due_date) : "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={f.status === "PAID" ? "Fully Paid" : f.status === "PARTIAL" ? "Partially Paid" : "Unpaid"} /></td>
                    {can("fee:update") && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-3 items-center">
                          <button 
                            onClick={() => {
                              setEditFeeId(f.id);
                              setEditFeeData({
                                waiver_percentage: f.waiver_percentage ? f.waiver_percentage.toString() : "",
                                due_date: f.due_date ? f.due_date : ""
                              });
                              setEditOpen(true);
                            }}
                            className="text-gray-400 hover:text-primary-600 transition-colors"
                            title="Edit Fee Details"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          
                          {f.status !== "paid" && (
                            <button 
                              onClick={() => sendReminder(f)}
                              className="text-gray-400 hover:text-amber-500 transition-colors"
                              title="Send Reminder"
                            >
                              <Bell className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setDeleteTarget(f)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete Fee Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          
                          {f.status !== "paid" && (
                            <div className="flex items-center gap-1 border-l border-gray-200 pl-3 ml-1">
                              <input 
                                type="number" 
                                step="500" 
                                min="0" 
                                max="100000"
                                placeholder={`${currencySymbol} Amount`} 
                                className="input w-24 px-2 py-1 text-xs" 
                                value={savingId === f.id ? paymentAmount : ""} 
                                onChange={(e) => { 
                                  if (savingId !== f.id) { 
                                    setSavingId(f.id); 
                                    setPaymentAmount(e.target.value); 
                                  } else { 
                                    setPaymentAmount(e.target.value); 
                                  } 
                                }} 
                              />
                              <button onClick={() => recordPayment(f)} disabled={savingId === f.id && !paymentAmount} className="btn-primary py-1 px-3 text-xs">Record</button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{filtered.length} fee record(s)</p>
        </div>
      )}

      <Modal open={open} title="New Fee Record" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Student</label>
            <select value={newFee.student_id ?? ""} onChange={(e) => setNewFee({ ...newFee, student_id: e.target.value ? Number(e.target.value) : null })} className="input w-full">
              <option value="">Select student</option>
              {studentsList.map((s) => <option key={s.id} value={s.id}>{s.full_name || `#${s.id}`}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Waiver Percentage (0-100)</label>
            <input type="number" min="0" max="100" step="1" value={newFee.waiver_percentage} onChange={(e) => setNewFee({ ...newFee, waiver_percentage: e.target.value })} className="input w-full" placeholder="e.g. 10 for 10%" />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" value={newFee.due_date} onChange={(e) => setNewFee({ ...newFee, due_date: e.target.value })} className="input w-full" />
          </div>
          <div>
            <label className="label">Academic Year</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 font-medium cursor-not-allowed">
              {settings.current_academic_year || "2026-27"}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} disabled={savingNew} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={savingNew} className="btn-primary flex items-center gap-2"><Save className="h-4 w-4" /> {savingNew ? "Creating…" : "Create"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} title="Edit Fee Deadline & Waiver" onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Waiver Percentage (0-100)</label>
            <input type="number" min="0" max="100" step="1" value={editFeeData.waiver_percentage} onChange={(e) => setEditFeeData({ ...editFeeData, waiver_percentage: e.target.value })} className="input w-full" placeholder="e.g. 10 for 10%" />
          </div>
          <div>
            <label className="label">Due Date (Deadline)</label>
            <input type="date" value={editFeeData.due_date} onChange={(e) => setEditFeeData({ ...editFeeData, due_date: e.target.value })} className="input w-full" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} disabled={savingEdit} className="btn-secondary">Cancel</button>
            <button onClick={handleEditSave} disabled={savingEdit} className="btn-primary flex items-center gap-2"><Save className="h-4 w-4" /> {savingEdit ? "Saving…" : "Save Changes"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Fee Record"
        message={`Are you sure you want to delete this fee record for ${studentsList.find(s => s.id === deleteTarget?.student_id)?.full_name || 'this student'}? This action cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
