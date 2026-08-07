"use client";

import { useState, useEffect } from "react";
import { ClipboardList, ShieldAlert } from "lucide-react";
import api from "@/lib/api";

interface AuditLogRecord {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/audit-logs/").then((res) => setLogs(res.data)).catch((err) => setError(err?.message || "Failed to load audit logs")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading audit logs…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>
      {logs.length === 0 ? (
        <div className="card text-center py-8"><ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No audit logs found.</p></div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900">
                        <ShieldAlert className="h-4 w-4 text-gray-400" />{l.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{l.entity_type ? `${l.entity_type}${l.entity_id != null ? ` #${l.entity_id}` : ""}` : "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">{l.description || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{l.user_name ? `${l.user_name}${l.user_role ? ` (${l.user_role})` : ""}` : "System"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{l.ip_address || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">{logs.length} audit log(s)</p>
        </div>
      )}
    </div>
  );
}
