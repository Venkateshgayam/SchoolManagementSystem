"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ClipboardList, Search, Calendar, Filter, RefreshCw, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_role: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

type DatePreset = "7d" | "30d" | "90d" | "all" | "custom";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toLocaleDateString("en-CA");
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA");
  });
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const fetchLogs = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (start) params.start_date = start;
      if (end) params.end_date = end;
      const res = await api.get("/audit-logs/", { params });
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const start = d.toLocaleDateString("en-CA");
      const end = new Date().toLocaleDateString("en-CA");
      setStartDate(start);
      setEndDate(end);
      fetchLogs(start, end);
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const start = d.toLocaleDateString("en-CA");
      const end = new Date().toLocaleDateString("en-CA");
      setStartDate(start);
      setEndDate(end);
      fetchLogs(start, end);
    } else if (preset === "90d") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      const start = d.toLocaleDateString("en-CA");
      const end = new Date().toLocaleDateString("en-CA");
      setStartDate(start);
      setEndDate(end);
      fetchLogs(start, end);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
      fetchLogs();
    }
  }, [preset, fetchLogs]);

  const handleCustomApply = () => {
    fetchLogs(startDate || undefined, endDate || undefined);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = search.trim().toLowerCase();
      const action = (log.action || "").toLowerCase();
      const entity = (log.entity_type || "").toLowerCase();
      const user = (log.user_name || "").toLowerCase();
      const desc = (log.description || "").toLowerCase();
      const ip = (log.ip_address || "").toLowerCase();

      const matchesSearch = !q || (
        action.includes(q) ||
        entity.includes(q) ||
        user.includes(q) ||
        desc.includes(q) ||
        ip.includes(q)
      );

      const matchesAction =
        actionFilter === "ALL" ||
        (log.action || "").toUpperCase() === actionFilter.toUpperCase();

      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.action) set.add(l.action.toUpperCase());
    });
    return Array.from(set).sort();
  }, [logs]);

  const getActionBadgeClass = (actionName: string | null) => {
    const act = (actionName || "").toUpperCase();
    if (act.includes("DELETE") || act.includes("REMOVE")) {
      return "bg-red-100 text-red-800 border border-red-200";
    }
    if (act.includes("CREATE") || act.includes("INSERT") || act.includes("ADD")) {
      return "bg-green-100 text-green-800 border border-green-200";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("MODIFY")) {
      return "bg-blue-100 text-blue-800 border border-blue-200";
    }
    if (act.includes("LOGIN") || act.includes("AUTH")) {
      return "bg-purple-100 text-purple-800 border border-purple-200";
    }
    return "bg-gray-100 text-gray-800 border border-gray-200";
  };

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="System activity, security events, and immutable audit trail"
        icon={ClipboardList}
        action={
          <button
            onClick={() => fetchLogs(startDate || undefined, endDate || undefined)}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Date Range & Preset Filters */}
      <div className="card mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-semibold text-gray-800">Date Range Filter</span>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setPreset("7d")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                preset === "7d"
                  ? "bg-white text-primary-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Last 7 days
            </button>
            <button
              onClick={() => setPreset("30d")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                preset === "30d"
                  ? "bg-white text-primary-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Last 30 days
            </button>
            <button
              onClick={() => setPreset("90d")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                preset === "90d"
                  ? "bg-white text-primary-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Last 90 days
            </button>
            <button
              onClick={() => setPreset("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                preset === "all"
                  ? "bg-white text-primary-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All time
            </button>
            <button
              onClick={() => setPreset("custom")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                preset === "custom"
                  ? "bg-white text-primary-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Date Pickers & Search Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset("custom");
              }}
              className="input-field py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset("custom");
              }}
              className="input-field py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="input-field py-1.5 text-sm bg-white"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleCustomApply}
              disabled={loading}
              className="btn-primary py-2 text-sm w-full"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative pt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs by user, action, entity, IP or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
            <span className="text-sm">Loading audit logs...</span>
          </div>
        </div>
      ) : error ? (
        <div className="card max-w-lg mx-auto text-center py-8">
          <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-danger-600 mb-4 text-sm">{error}</p>
          <button onClick={() => fetchLogs(startDate || undefined, endDate || undefined)} className="btn-primary">
            Retry
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-800 mb-1">No Audit Logs Found</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {search || actionFilter !== "ALL"
              ? "No events matched your current search and action filters. Try clearing or expanding the date range."
              : "No audit events recorded within the selected date window."}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.user_name || (log.user_id ? `User #${log.user_id}` : "System")}
                      </div>
                      {log.user_role && (
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                          {log.user_role}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getActionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {log.entity_type ? `${log.entity_type} ${log.entity_id ? `#${log.entity_id}` : ""}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                      <p className="line-clamp-2">{log.description || "—"}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                      {log.ip_address || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
            <span>
              Showing {filteredLogs.length} of {logs.length} logged event(s)
            </span>
            <span className="text-xs text-gray-400">
              Audit logs are permanently preserved and immutable.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
