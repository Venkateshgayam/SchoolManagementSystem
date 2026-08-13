/**
 * Shared grade utility functions driven by the configurable grading_scale setting.
 */

export interface GradeScaleEntry {
  grade: string;
  min_percent: number;
}

/**
 * Default fallback scale – mirrors the seed data.
 * Only used when the DB setting is unavailable.
 */
const DEFAULT_SCALE: GradeScaleEntry[] = [
  { grade: "A", min_percent: 90 },
  { grade: "B", min_percent: 80 },
  { grade: "C", min_percent: 70 },
  { grade: "D", min_percent: 60 },
  { grade: "F", min_percent: 0 },
];

/**
 * Derive a letter grade from a percentage using the configured scale.
 * @param pct        Percentage (0–100)
 * @param scale      Array from settings.grading_scale (JSON type)
 * @returns          Letter grade string, e.g. "A", "B", "F"
 */
export function getLetterGrade(
  pct: number,
  scale?: GradeScaleEntry[] | null
): string {
  const s = Array.isArray(scale) && scale.length > 0 ? scale : DEFAULT_SCALE;
  // Sort descending by min_percent so first match wins
  const sorted = [...s].sort((a, b) => b.min_percent - a.min_percent);
  for (const entry of sorted) {
    if (pct >= entry.min_percent) return entry.grade;
  }
  return sorted[sorted.length - 1]?.grade ?? "F";
}

/**
 * Return a Tailwind colour-class pair for a letter grade badge.
 * Handles any letter; unknown grades get a neutral style.
 */
export function getGradeColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case "A":
      return "bg-green-100 text-green-800";
    case "B":
      return "bg-blue-100 text-blue-800";
    case "C":
      return "bg-yellow-100 text-yellow-800";
    case "D":
      return "bg-orange-100 text-orange-800";
    case "F":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
