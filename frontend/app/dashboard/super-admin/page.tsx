"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2, Users, ShieldCheck, Activity, ClipboardList, ArrowRight, School,
} from "lucide-react";
import api from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";

interface SchoolRecord {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  principal_name: string | null;
  established_year: number | null;
  created_at: string;
}
interface UserRecord { id: number; email: string; username: string; role: string; full_name: string; phone_number: string | null; is_active: boolean; created_at: string; }
interface AuditLogRecord { id: number; action: string; entity_type: string | null; entity_id: number | null; description: string | null; user_name: string | null; user_role: string | null; created_at: string; }

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [sc, us, lg] = await Promise.all([
          api.get("/schools/").catch(() => ({ data: [] })),
          api.get("/users/").catch(() => ({ data: [] })),
          api.get("/audit-logs/").catch(() => ({ data: [] })),
        ]);
        setSchools(sc.data);
        setUsers(us.data);
        setLogs(lg.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const superAdmins = users.filter((u) => u.role === "super_admin");
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const recentLogs = logs.slice(0, 8);
  const recentSchools = schools
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading dashboard…</div></div>;
  if (error) return (<div className="card max-w-lg mx-auto text-center py-8"><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="btn-primary">Retry</button></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Schools" value={schools.length} icon={Building2} />
        <StatCard title="Super Admins" value={superAdmins.length} icon={ShieldCheck} />
        <StatCard title="Total Admins" value={totalAdmins} icon={Users} />
        <StatCard title="Active Users" value={activeUsers} icon={Activity} trend={`${users.length} total user accounts`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Recent Audit Logs</span>
            <Link href="/dashboard/super-admin/audit-logs" className="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </h2>
          {recentLogs.length === 0 ? (
            <p className="text-gray-600">No audit activity recorded.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((l) => (
                <div key={l.id} className="flex items-start gap-3">
                  <ClipboardList className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{l.action}{l.entity_type ? ` · ${l.entity_type}` : ""}{l.entity_id != null ? ` #${l.entity_id}` : ""}</p>
                    <p className="text-sm text-gray-600 truncate">{l.description || "—"}</p>
                    <p className="text-xs text-gray-400">{l.user_name || "System"} {l.user_role ? `(${l.user_role})` : ""} · {new Date(l.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Recent Schools</span>
            <Link href="/dashboard/super-admin/schools" className="text-sm text-primary-600 hover:text-primary-500 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </h2>
          {recentSchools.length === 0 ? (
            <p className="text-gray-600">No schools registered.</p>
          ) : (
            <div className="space-y-3">
              {recentSchools.map((s) => (
                <div key={s.id} className="flex items-start gap-3">
                  <School className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-sm text-gray-600 truncate">{s.address || "—"}</p>
                    <p className="text-xs text-gray-400">{s.principal_name || "No principal"} · {s.established_year || "—"} · {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
