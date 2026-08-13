export function formatStudentNameId(name?: string | null, id?: number | null, rollNumber?: string | null): string {
  if (!id) return "Unknown Student";
  const displayName = name || `Student #${id}`;
  const displayId = rollNumber || `STU-${String(id).padStart(3, '0')}`;
  return `${displayName} (${displayId})`;
}

export function formatTeacherNameId(name?: string | null, id?: number | null): string {
  if (!id) return "Unknown Teacher";
  const displayName = name || `Teacher #${id}`;
  const displayId = `TCH-${String(id).padStart(3, '0')}`;
  return `${displayName} (${displayId})`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB");
}
