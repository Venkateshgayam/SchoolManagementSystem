"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, AlertCircle, CheckCircle2, ArrowUpDown } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { refreshSettings } from "@/hooks/useSettings";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ScaleEntry {
  grade: string;
  min_percent: number;
  /** Derived — not stored in DB */
  max_percent?: number;
}

interface GradingScaleEditorProps {
  /** Raw JSON string value of the grading_scale setting */
  rawValue: string;
  /** Called after a successful save so the parent can re-fetch */
  onSaved?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseScale(raw: string): ScaleEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((e: any) => ({ grade: String(e.grade ?? ""), min_percent: Number(e.min_percent ?? 0) }))
        .sort((a, b) => b.min_percent - a.min_percent);
    }
  } catch {}
  return [
    { grade: "A", min_percent: 90 },
    { grade: "B", min_percent: 80 },
    { grade: "C", min_percent: 70 },
    { grade: "D", min_percent: 60 },
    { grade: "F", min_percent: 0 },
  ];
}

/** Derive max_percent for each entry (exclusive upper bound). Top grade ends at 100. */
function withRanges(entries: ScaleEntry[]): ScaleEntry[] {
  const sorted = [...entries].sort((a, b) => b.min_percent - a.min_percent);
  return sorted.map((entry, idx) => ({
    ...entry,
    max_percent: idx === 0 ? 100 : sorted[idx - 1].min_percent,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validate(entries: ScaleEntry[]): string[] {
  const errors: string[] = [];

  if (entries.length < 2) {
    errors.push("At least 2 grade entries are required.");
  }

  // Check for empty names
  entries.forEach((e, i) => {
    if (!e.grade.trim()) errors.push(`Row ${i + 1}: Grade name cannot be empty.`);
  });

  // Check for duplicate names
  const names = entries.map((e) => e.grade.trim().toUpperCase());
  const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupNames.length > 0) {
    errors.push(`Duplicate grade name(s): ${Array.from(new Set(dupNames)).join(", ")}`);
  }

  // Check for out-of-range percentages
  entries.forEach((e, i) => {
    if (e.min_percent < 0 || e.min_percent > 100) {
      errors.push(`Row ${i + 1} ("${e.grade}"): Minimum % must be between 0 and 100.`);
    }
  });

  // Check for duplicate min_percent
  const percents = entries.map((e) => e.min_percent);
  const dupPcts = percents.filter((p, i) => percents.indexOf(p) !== i);
  if (dupPcts.length > 0) {
    errors.push(`Duplicate minimum percentages: ${Array.from(new Set(dupPcts)).join(", ")}%`);
  }

  // Lowest grade must start at 0
  const sorted = [...entries].sort((a, b) => a.min_percent - b.min_percent);
  if (sorted.length > 0 && sorted[0].min_percent !== 0) {
    errors.push(`The lowest grade ("${sorted[0].grade}") must have a minimum of 0%.`);
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GradingScaleEditor({ rawValue, onSaved }: GradingScaleEditorProps) {
  const [entries, setEntries] = useState<ScaleEntry[]>(() => parseScale(rawValue));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Re-parse when rawValue changes externally (e.g. page reload)
  useEffect(() => {
    setEntries(parseScale(rawValue));
    setErrors([]);
  }, [rawValue]);

  const displayEntries = withRanges(entries);

  // ── Handlers ──

  const handleGradeChange = (idx: number, value: string) => {
    setSaved(false);
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], grade: value };
      return next;
    });
  };

  const handleMinChange = (idx: number, value: string) => {
    setSaved(false);
    const num = parseFloat(value);
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], min_percent: isNaN(num) ? 0 : num };
      return next;
    });
  };

  const handleDelete = (idx: number) => {
    setSaved(false);
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    setSaved(false);
    // Suggest a min_percent that doesn't conflict
    const usedPercents = new Set(entries.map((e) => e.min_percent));
    let suggested = 50;
    while (usedPercents.has(suggested) && suggested > 0) suggested -= 5;
    setEntries((prev) => [...prev, { grade: "", min_percent: suggested }]);
  };

  const handleSave = async () => {
    const errs = validate(entries);
    setErrors(errs);
    if (errs.length > 0) return;

    setSaving(true);
    setSaved(false);
    try {
      const payload = entries
        .map(({ grade, min_percent }) => ({ grade: grade.trim(), min_percent }))
        .sort((a, b) => b.min_percent - a.min_percent);

      await api.put("/settings/grading_scale", {
        key: "grading_scale",
        value: JSON.stringify(payload),
        type: "json",
        description: "Grading scale thresholds — minimum percentage for each letter grade",
      });

      refreshSettings();
      setSaved(true);
      toast.success("Grading scale saved successfully");
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save grading scale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Grade
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Minimum %
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Effective Range
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {displayEntries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                {/* Grade name */}
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={entry.grade}
                    onChange={(e) => handleGradeChange(idx, e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="e.g. A"
                    className="w-20 px-2 py-1.5 text-sm font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 text-center uppercase"
                  />
                </td>
                {/* Min % */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={entry.min_percent}
                      onChange={(e) => handleMinChange(idx, e.target.value)}
                      className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 text-center"
                    />
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </td>
                {/* Effective range (derived) */}
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 font-mono">
                    {entry.min_percent}%
                    {" – "}
                    {entry.max_percent === 100
                      ? "100%"
                      : `<${entry.max_percent}%`}
                  </span>
                </td>
                {/* Delete */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete this grade"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {displayEntries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                  No grades defined. Click "+ Add Grade" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-1">
          <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Please fix the following issues:
          </div>
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600 ml-6">• {err}</p>
          ))}
        </div>
      )}

      {/* Success indicator */}
      {saved && errors.length === 0 && (
        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Grading scale saved successfully.
        </div>
      )}

      {/* Helper note */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <ArrowUpDown className="h-3 w-3" />
        Ranges are sorted automatically. The lowest grade must start at 0%. Maximum % is derived from adjacent rows.
      </p>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 border border-primary-200 rounded-md hover:bg-primary-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Grade
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-1.5 py-1.5 px-4 text-sm disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Grading Scale"}
        </button>
      </div>
    </div>
  );
}
