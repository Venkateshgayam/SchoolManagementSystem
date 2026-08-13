"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Search } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";

interface AuditLog {
  id: number;
  user_id: number;
  user_name: string | null;
  user_role: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  ip_address: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get("/audit-logs/");
        setLogs(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.user_name || "").toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex justify-center py-12"><div className="text-gray-500">Loading audit logs...</div></div>;
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-danger-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="System activity and security events"
        icon={ClipboardList}
      />

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs by action, user, entity, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="card text-center py-8">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No logs found.</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.user_name || "System"}</div>
                      <div className="text-xs text-gray-500">{log.user_role || ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.action.includes('delete') ? 'bg-red-100 text-red-800' :
                        log.action.includes('create') ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{filteredLogs.length} event(s)</p>
        </div>
      )}
    </div>
  );
}
