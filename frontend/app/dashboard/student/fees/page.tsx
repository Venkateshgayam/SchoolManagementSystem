"use client";

import { formatDate } from "@/lib/formatters";
import { useState, useEffect } from "react";
import { FileText, DollarSign, Calendar, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";

import { useSettings } from "@/hooks/useSettings";

interface FeeRecord {
  id: number;
  student_id: number;
  total_fee: number;
  amount_paid: number;
  amount_due: number;
  late_fee_applied?: number;
  due_date: string | null;
  paid_date: string | null;
  status: string;
  academic_year: string | null;
}

export default function StudentFeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { settings } = useSettings();
  const currencySymbol = settings.currency_symbol || "$";
  const formatCurrency = (amount: number) => `${currencySymbol}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    async function fetchFees() {
      try {
        const res = await api.get("/fees/");
        setFees(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load fees");
      } finally {
        setLoading(false);
      }
    }

    fetchFees();
  }, []);

  const totalFees = fees.reduce((sum, f) => sum + (f.total_fee || 0), 0);
  const paidFees = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
  const pendingFees = fees.filter((f) => f.status === "PENDING" || f.status === "PARTIAL");
  const overdueFees = fees.filter((f) => f.status === "OVERDUE" || (f.amount_due > 0 && f.due_date && new Date(f.due_date) < new Date()));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading fee information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fee Information</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Total Fees</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            {formatCurrency(totalFees)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Paid</p>
          <p className="mt-2 text-3xl font-bold text-green-600 flex items-center justify-center gap-2">
            {formatCurrency(paidFees)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm font-medium text-gray-500">Outstanding</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {formatCurrency(totalFees - paidFees)}
          </p>
        </div>
      </div>

      {pendingFees.length > 0 && (
        <div className="card mb-6 border-l-4 border-l-yellow-500">
          <h3 className="font-semibold text-gray-900 mb-2">Pending Payments</h3>
          <div className="space-y-2">
            {pendingFees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">Fee #{fee.id}</p>
                  <p className="text-sm text-gray-500">
                    {fee.academic_year && `${fee.academic_year} · `}
                    Due: {fee.due_date ? formatDate(fee.due_date) : "N/A"}
                  </p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {overdueFees.length > 0 && (
        <div className="card mb-6 border-l-4 border-l-red-500">
          <h3 className="font-semibold text-gray-900 mb-2">Overdue Payments</h3>
          <div className="space-y-2">
            {overdueFees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">Fee #{fee.id}</p>
                  <p className="text-sm text-gray-500">
                    {fee.academic_year && `${fee.academic_year} · `}
                    Due: {fee.due_date ? formatDate(fee.due_date) : "N/A"}
                  </p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Overdue
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Fee Records</h2>
        {fees.length === 0 ? (
          <p className="text-gray-600">No fee records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academic Year</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fees.map((fee) => (
                  <tr key={fee.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{fee.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(fee.total_fee)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(fee.amount_due)}
                      {fee.late_fee_applied && fee.late_fee_applied > 0 ? <div className="text-xs text-red-500">Includes {formatCurrency(fee.late_fee_applied)} late fee</div> : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {fee.due_date ? formatDate(fee.due_date) : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          fee.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : fee.status === "OVERDUE"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {fee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{fee.academic_year || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}