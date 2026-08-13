"use client";

import React from "react";
import { CheckCircle, XCircle, AlertTriangle, GraduationCap, AlertCircle } from "lucide-react";
import { getGradeColor } from "@/lib/gradeUtils";

export interface SubjectResult {
  subject_id: number;
  subject_name: string;
  marks_obtained: number | null;
  total_marks: number | null;
  percentage: number | null;
  letter_grade: string | null;
  status: string;
}

export interface FailedSubject {
  subject_id: number;
  subject_name: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  letter_grade: string;
}

export interface MissingSubject {
  subject_id: number;
  subject_name: string;
}

export interface OverallResultData {
  student_id: number;
  total_marks: number;
  total_max_marks: number;
  percentage: number;
  overall_grade: string;
  overall_result: string;
  subjects: SubjectResult[];
  failed_subjects: FailedSubject[];
  missing_subjects: MissingSubject[];
}

export default function OverallResult({ result }: { result: OverallResultData | null }) {
  if (!result) return null;

  const isPass = result.overall_result === "PASS";
  const isFail = result.overall_result === "FAIL";
  const isIncomplete = result.overall_result === "INCOMPLETE";

  return (
    <div className="card mb-6 border-l-4 overflow-hidden" 
      style={{
        borderLeftColor: isPass ? "#10b981" : isFail ? "#ef4444" : "#f59e0b"
      }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-gray-500" />
            Overall Examination Result
          </h2>
          <p className="text-sm text-gray-500 mt-1">Based on required subjects for the enrolled class</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg"
          style={{
            backgroundColor: isPass ? "#ecfdf5" : isFail ? "#fef2f2" : "#fffbeb",
            color: isPass ? "#047857" : isFail ? "#b91c1c" : "#b45309"
          }}>
          {isPass && <CheckCircle className="h-5 w-5" />}
          {isFail && <XCircle className="h-5 w-5" />}
          {isIncomplete && <AlertTriangle className="h-5 w-5" />}
          {result.overall_result}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Marks</p>
          <p className="text-2xl font-bold text-gray-900">
            {result.total_marks} <span className="text-sm font-normal text-gray-500">/ {result.total_max_marks}</span>
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-1">Overall Percentage</p>
          <p className="text-2xl font-bold text-gray-900">
            {result.percentage.toFixed(2)}%
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-1">Overall Grade</p>
          <div className="mt-1">
            <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getGradeColor(result.overall_grade)}`}>
              {result.overall_grade}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-1">Subjects Graded</p>
          <p className="text-2xl font-bold text-gray-900">
            {result.subjects.length - result.missing_subjects.length} <span className="text-sm font-normal text-gray-500">/ {result.subjects.length}</span>
          </p>
        </div>
      </div>

      {/* Details Sections */}
      <div className="space-y-4">
        
        {/* Missing Subjects Warning */}
        {isIncomplete && result.missing_subjects.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex gap-2 text-amber-800 font-medium mb-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3>Missing Results (INCOMPLETE)</h3>
            </div>
            <p className="text-sm text-amber-700 ml-7 mb-2">The following required subjects have no grades recorded yet:</p>
            <ul className="list-disc ml-11 text-sm text-amber-700">
              {result.missing_subjects.map(ms => (
                <li key={ms.subject_id}>{ms.subject_name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Failed Subjects Warning */}
        {isFail && result.failed_subjects.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex gap-2 text-red-800 font-medium mb-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3>Failed Subjects</h3>
            </div>
            <p className="text-sm text-red-700 ml-7 mb-2">The student has failed the following subjects, resulting in an overall FAIL:</p>
            <div className="ml-7 mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {result.failed_subjects.map(fs => (
                <div key={fs.subject_id} className="bg-white border border-red-100 rounded p-2 text-sm">
                  <div className="font-semibold text-gray-900">{fs.subject_name}</div>
                  <div className="text-gray-600 mt-1">
                    {fs.marks_obtained} / {fs.total_marks} ({fs.percentage.toFixed(1)}%)
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getGradeColor(fs.letter_grade)}`}>
                      Grade {fs.letter_grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
