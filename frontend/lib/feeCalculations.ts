export interface FeeCalcStudent {
  id: number;
  class_id: number | null;
  status: string;
}

export interface FeeCalcClass {
  id: number;
  fee_amount: number;
}

export interface FeeCalcRecord {
  id: number;
  student_id: number;
  total_fee: number;
  amount_paid: number;
  status: string;
  academic_year: string | null;
}

export function calculateFeeSummary(
  students: FeeCalcStudent[],
  classes: FeeCalcClass[],
  fees: FeeCalcRecord[],
  currentAcademicYear: string
) {
  const currentFees = fees.filter((f) => f.academic_year === currentAcademicYear);
  const activeStudents = students.filter((s) => s.status === "active");

  const expectedRevenue = activeStudents.reduce((sum, s) => {
    const feeRecord = currentFees.find((f) => f.student_id === s.id);
    if (feeRecord) {
      return sum + (feeRecord.total_fee || 0);
    }
    const cls = classes.find((c) => c.id === s.class_id);
    return sum + (cls?.fee_amount || 0);
  }, 0);

  const revenue = currentFees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
  const pendingAmount = Math.max(0, expectedRevenue - revenue);
  const collectionRate = expectedRevenue > 0 ? ((revenue / expectedRevenue) * 100).toFixed(1) : "0.0";
  const paidCount = currentFees.filter((f) => f.status === "PAID").length;
  const pendingFeesCount = currentFees.filter((f) => f.status !== "PAID" && f.status !== "WAIVED").length;

  return {
    currentFees,
    expectedRevenue,
    revenue,
    pendingAmount,
    collectionRate,
    paidCount,
    pendingFeesCount,
    activeStudentsCount: activeStudents.length,
  };
}
