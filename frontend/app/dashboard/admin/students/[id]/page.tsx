"use client";
import { formatDate } from "@/lib/formatters";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Calendar, BookOpen, ClipboardCheck, TrendingUp, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import Link from "next/link";
import { formatStudentNameId, formatTeacherNameId } from "@/lib/formatters";
import OverallResult, { OverallResultData } from "@/components/dashboard/OverallResult";
import { calculateAttendanceStats } from "@/lib/attendanceCalculations";

interface StudentProfile {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  roll_number: string | null;
  class_id: number | null;
  parent_email: string | null;
  parent_phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  enrollment_date: string;
  status: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ClassInfo {
  id: number;
  name: string;
  section: string | null;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
}

interface GradeRecord {
  id: number;
  subject_id: number;
  exam_id: number | null;
  marks_obtained: number;
  total_marks: number;
  percentage: number | null;
  subject?: {
    id: number;
    name: string;
  };
}

interface SubjectInfo {
  id: number;
  name: string;
}

interface ExamInfo {
  id: number;
  title: string;
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [overallResult, setOverallResult] = useState<OverallResultData | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [studentRes, attRes, gradesRes, subjectsRes, examsRes] = await Promise.all([
          api.get(`/students/${id}`),
          api.get("/attendance/"),
          api.get("/grades/"),
          api.get("/subjects/"),
          api.get("/exams/")
        ]);

        setStudent(studentRes.data);
        
        // Filter attendance and grades for this specific student
        setAttendance(attRes.data.filter((a: any) => a.student_id === Number(id)));
        const studentGrades = gradesRes.data.filter((g: any) => g.student_id === Number(id));
        setGrades(studentGrades);
        setSubjects(subjectsRes.data);
        setExams(examsRes.data);
        
        // Auto-select most recent exam if available
        const latestExamId = studentGrades.length > 0 
          ? Math.max(...studentGrades.map((g: any) => g.exam_id).filter(Boolean)) 
          : "";
        if (latestExamId !== -Infinity && latestExamId) {
          setSelectedExamId(latestExamId);
        }

        if (studentRes.data.class_id) {
          const classRes = await api.get(`/classes/${studentRes.data.class_id}`);
          setClassInfo(classRes.data);
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load student profile. You may not have permission.");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProfile();
  }, [id]);

  useEffect(() => {
    if (selectedExamId) {
      api.get(`/results/student/${id}?exam_id=${selectedExamId}`)
        .then(res => setOverallResult(res.data))
        .catch(() => setOverallResult(null));
    } else {
      setOverallResult(null);
    }
  }, [selectedExamId, id]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="text-gray-500">Loading profile...</div></div>;
  }

  if (error || !student) {
    return (
      <div className="card max-w-lg mx-auto text-center py-8">
        <p className="text-danger-600 mb-4">{error || "Student not found"}</p>
        <Link href="/dashboard/admin/students" className="btn-primary">Back to My Students</Link>
      </div>
    );
  }

  const { rate: attendanceRate, present, late, absent } = calculateAttendanceStats(attendance);
  
  const avgGrade = grades.length === 0 ? 0 :
    grades.reduce((sum, g) => sum + (g.percentage ?? (g.marks_obtained / g.total_marks) * 100), 0) / grades.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/admin/students" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <PageHeader 
          title={student.full_name || `${student.user?.first_name || 'Student'} ${student.user?.last_name || ''}`}
          subtitle={`Roll No: ${student.roll_number || 'N/A'}`}
          icon={User}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Attendance Rate" 
          value={`${attendanceRate.toFixed(1)}%`} 
          icon={ClipboardCheck} 
          trend={
            <div className="flex flex-col text-xs text-gray-500 mt-1">
              <span>Present: {present} | Late: {late} | Absent: {absent}</span>
            </div>
          }
        />
        <StatCard title="Average Grade" value={`${avgGrade.toFixed(1)}%`} icon={TrendingUp} />
        <StatCard title="Enrolled Class" value={classInfo ? `${classInfo.name} ${classInfo.section || ''}` : "N/A"} icon={BookOpen} />
        <StatCard title="Status" value={student.status} icon={User} />
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Exam Results</h2>
          <select
            className="input-field w-full md:w-64"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">-- Select an Exam --</option>
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.title}</option>
            ))}
          </select>
        </div>
        
        {selectedExamId ? (
          <OverallResult result={overallResult} />
        ) : (
          <p className="text-gray-500 text-sm italic">Select an exam to view the overall result.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & Info</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Student Email</p>
                <p className="text-sm text-gray-600">{student.email || student.user?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Parent Phone</p>
                <p className="text-sm text-gray-600">{student.parent_phone || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Parent Email</p>
                <p className="text-sm text-gray-600">{student.parent_email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Address</p>
                <p className="text-sm text-gray-600">{student.address || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Date of Birth</p>
                <p className="text-sm text-gray-600">{student.date_of_birth ? formatDate(student.date_of_birth) : "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Grades</h2>
            {grades.length === 0 ? (
              <p className="text-gray-600 text-sm">No grades recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {grades.map(g => {
                      const exam = exams.find(e => e.id === g.exam_id);
                      const pct = g.percentage ?? (g.marks_obtained / g.total_marks) * 100;
                      return (
                        <tr key={g.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{g.subject?.name || "Unknown"}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{exam?.title || "General"}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{g.marks_obtained} / {g.total_marks}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h2>
            {attendance.length === 0 ? (
              <p className="text-gray-600 text-sm">No attendance records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendance.slice(0, 10).map(a => (
                      <tr key={a.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDate(a.date)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            a.status === 'present' ? 'bg-green-100 text-green-800' :
                            a.status === 'absent' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {a.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
