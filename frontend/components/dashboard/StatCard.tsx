"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

export default function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="card group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-12 h-12 bg-role-100 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-6 w-6 text-role-600" />
        </div>
      </div>
      {trend && (
        <p className="mt-3 text-sm text-gray-500">{trend}</p>
      )}
    </div>
  );
}