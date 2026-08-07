"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";

interface LeaveRequestRecord {
  id: number;
  student_id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: string;
  approved_by: number | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface LeaveRequestForm {
  from_date: string;
  to_date: string;
  reason: string;
}

export default function StudentLeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestForm>();

  useEffect(() => {
    async function fetchLeaveRequests() {
      try {
        const res = await api.get("/leave-requests/");
        setLeaveRequests(res.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load leave requests");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaveRequests();
  }, []);

  const onSubmit = async (data: LeaveRequestForm) => {
    setSubmitting(true);
    try {
      await api.post("/leave-requests", data);
      const res = await api.get("/leave-requests/");
      setLeaveRequests(res.data);
      setShowForm(false);
      reset();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading leave requests...</div>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Cancel" : "New Leave Request"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Leave Request</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="from_date" className="label">From Date</label>
              <input id="from_date" type="date" className="input-field" {...register("from_date", { required: "From date is required" })} />
              {errors.from_date && <p className="mt-1 text-sm text-danger-500">{errors.from_date.message}</p>}
            </div>
            <div>
              <label htmlFor="to_date" className="label">To Date</label>
              <input id="to_date" type="date" className="input-field" {...register("to_date", { required: "To date is required" })} />
              {errors.to_date && <p className="mt-1 text-sm text-danger-500">{errors.to_date.message}</p>}
            </div>
            <div>
              <label htmlFor="reason" className="label">Reason</label>
              <textarea id="reason" className="input-field" rows={3} {...register("reason")} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      )}

      {leaveRequests.length === 0 ? (
        <div className="card text-center py-8">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No leave requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaveRequests
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((request) => (
              <div key={request.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {request.from_date} to {request.to_date}
                      </h3>
                      {request.reason && (
                        <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                      )}
                      {request.remarks && (
                        <p className="text-sm text-gray-500 mt-1">Remarks: {request.remarks}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Submitted: {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}