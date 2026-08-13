"use client";

import { useState, useEffect } from "react";
import { BookOpen, Users, UserCheck, Calendar, ArrowLeft, Eye } from "lucide-react";
import {   formatStudentNameId , formatDate } from "@/lib/formatters";
import api from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import PageLoader from "@/components/dashboard/PageLoader";
import { useSettings } from "@/hooks/useSettings";

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
  academic_year: string | null;
  capacity: number | null;
  fee_amount: number;
}

interface StudentInfo {
  id: number;
  roll_number: string | null;
  full_name: string;
  status: string;
  enrollment_date: string;
}

export default function ClassDetail({ classId }: { classId: number }) {
  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const role = pathname.split("/")[2] || "admin";
  
  const { settings } = useSettings();
  const currencySymbol = settings.currency_symbol || "$";
  const formatCurrency = (amount: number) => `${currencySymbol}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    async function fetchData() {
      try {
        const [cRes, sRes] = await Promise.all([
          api.get(`/classes/${classId}`),
          api.get("/students/").catch(() => ({ data: [] }))
        ]);
        setCls(cRes.data);
        const myStudents = sRes.data.filter((s: any) => s.class_id === classId);
        setStudents(myStudents);
      } catch (err: any) {
        setError(err?.message || "Failed to load class details");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [classId]);

  if (loading) return <PageLoader label="Loading..." />;
  if (error || !cls) return (
    <div className="card max-w-lg mx-auto text-center py-8">
      <p className="text-gray-600 mb-4">{error || "Class not found"}</p>
      <Link href={`/dashboard/${role}/classes`} className="btn-secondary">Go Back</Link>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <Link href={`/dashboard/${role}/classes`} className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Classes
        </Link>
      </div>

      <PageHeader 
        title={`${cls.name} ${cls.section || ""}`.trim()} 
        subtitle={`Academic Year: ${cls.academic_year || "N/A"}`} 
        icon={BookOpen} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-lg"><Users className="h-6 w-6 text-primary-600" /></div>
          <div><p className="text-sm font-medium text-gray-500">Total Students</p><h3 className="text-2xl font-bold text-gray-900">{students.length}</h3></div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg"><UserCheck className="h-6 w-6 text-green-600" /></div>
          <div><p className="text-sm font-medium text-gray-500">Capacity</p><h3 className="text-2xl font-bold text-gray-900">{cls.capacity || "Unlimited"}</h3></div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><Calendar className="h-6 w-6 text-blue-600" /></div>
          <div><p className="text-sm font-medium text-gray-500">Base Fee</p><h3 className="text-xl font-bold text-gray-900">{formatCurrency(cls.fee_amount || 0)}</h3></div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Roster</h2>
        {students.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No students enrolled in this class.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((s) => (
                  <tr key={s.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.roll_number || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatStudentNameId(s.full_name, s.id, s.roll_number)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(s.enrollment_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Link href={`/dashboard/${role}/students/${s.id}`} className="text-gray-500 hover:text-blue-600 inline-block" title="Click here for student profile">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
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
