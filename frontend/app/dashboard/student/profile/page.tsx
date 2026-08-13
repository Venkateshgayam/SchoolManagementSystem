"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import { User, Mail, Phone, BookOpen, Calendar, MapPin } from "lucide-react";
import api from "@/lib/api";

interface StudentProfile {
  id: number;
  user_id: number;
  roll_number: string | null;
  class_id: number | null;
  parent_email: string | null;
  enrollment_date: string;
  status: string;
}

interface UserInfo {
  id: number;
  email: string;
  username: string;
  role: string;
  full_name: string;
  phone_number: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
}

export default function StudentProfilePage() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [studentRes, userRes, classesRes] = await Promise.all([
          api.get("/students/me").catch(() => ({ data: null })),
          api.get("/auth/me").catch(() => ({ data: null })),
          api.get("/classes/").catch(() => ({ data: [] })),
        ]);

        setStudent(studentRes.data);
        setUser(userRes.data);

        if (studentRes.data?.class_id && classesRes.data.length > 0) {
          const cls = classesRes.data.find((c: ClassInfo) => c.id === studentRes.data.class_id);
          if (cls) setClassInfo(cls);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading profile...</div>
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

  if (!student || !user) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-gray-600">Profile information not available.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
      <div className="card max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user.full_name}</h2>
            <p className="text-gray-500">Student ID: {student.roll_number || "N/A"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-gray-900 flex items-center gap-2">
              <Mail className="h-4 w-4" /> {user.email}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-gray-900 flex items-center gap-2">
              <Phone className="h-4 w-4" /> {user.phone_number || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Class</p>
            <p className="text-gray-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> {classInfo ? `${classInfo.name} ${classInfo.section || ""}` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="text-gray-900">{student.status}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Enrollment Date</p>
            <p className="text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {formatDate(student.enrollment_date)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Parent Email</p>
            <p className="text-gray-900">{student.parent_email || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}