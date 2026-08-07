"use client";

interface StatusBadgeProps {
  status: string | null | undefined;
}

const toneMap: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  present: "bg-green-100 text-green-800",
  true: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  absent: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  false: "bg-red-100 text-red-800",
  late: "bg-blue-100 text-blue-800",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return <span className="badge badge-info">—</span>;
  const key = String(status).toLowerCase();
  const tone = toneMap[key] || "bg-gray-100 text-gray-700";
  return <span className={`badge ${tone}`}>{status}</span>;
}