"""
Overall student examination result calculator.

GET /api/results/student/{student_id}  — Admin & Teacher: any student
GET /api/results/student/me            — Student: own result

Computed entirely from existing Grade rows + grading_scale setting.
No new DB columns; result is recalculated fresh on every request.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database.database import get_db
from app.models.grade import Grade
from app.models.student import Student
from app.models.subject import Subject
from app.models.class_model import Class
from app.core.dependencies import require_role, get_current_active_user, get_current_student
from app.core.settings import get_setting
from app.routers.grade import calculate_letter_grade

router = APIRouter(prefix="/results", tags=["results"])


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic response schemas
# ─────────────────────────────────────────────────────────────────────────────

class SubjectResult(BaseModel):
    subject_id: int
    subject_name: str
    marks_obtained: Optional[float] = None
    total_marks: Optional[float] = None
    percentage: Optional[float] = None
    letter_grade: Optional[str] = None
    status: str  # "PASS" | "FAIL" | "MISSING"


class FailedSubject(BaseModel):
    subject_id: int
    subject_name: str
    marks_obtained: float
    total_marks: float
    percentage: float
    letter_grade: str


class MissingSubject(BaseModel):
    subject_id: int
    subject_name: str


class OverallResult(BaseModel):
    student_id: int
    total_marks: float
    total_max_marks: float
    percentage: float
    overall_grade: str
    overall_result: str  # "PASS" | "FAIL" | "INCOMPLETE"
    subjects: List[SubjectResult]
    failed_subjects: List[FailedSubject]
    missing_subjects: List[MissingSubject]


# ─────────────────────────────────────────────────────────────────────────────
# Core calculation logic
# ─────────────────────────────────────────────────────────────────────────────

async def _get_failure_grade_label(db: AsyncSession) -> str:
    """
    Return the grade label that represents failure.
    This is the grade entry with min_percent == 0 in the configured scale.
    Falls back to 'F' if not determinable.
    """
    scale = await get_setting(db, "grading_scale", None)
    if scale and isinstance(scale, list):
        try:
            # The failing grade is the one with the lowest min_percent
            lowest = min(scale, key=lambda e: e.get("min_percent", 0))
            return lowest.get("grade", "F")
        except Exception:
            pass
    return "F"


async def _compute_result(student_id: int, exam_id: int, db: AsyncSession) -> OverallResult:
    """
    Compute the overall examination result for a student for a specific exam.

    Required subjects = all subjects assigned to the student's class.
    If the student has no class_id, fall back to subjects with any existing grade.
    """
    # 1. Load student
    student_res = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found"
        )

    # 2. Determine required subjects
    required_subjects: List[Subject] = []

    if student.class_id:
        # Load subjects linked to the student's class via curriculum AND scheduled for this exam
        from app.models.curriculum import Curriculum
        from app.models.exam import ExamSubjectSlot
        curr_res = await db.execute(
            select(Subject)
            .join(Curriculum, Curriculum.subject_id == Subject.id)
            .join(ExamSubjectSlot, ExamSubjectSlot.subject_id == Subject.id)
            .where(
                Curriculum.class_id == student.class_id,
                ExamSubjectSlot.exam_id == exam_id
            )
            .distinct()
        )
        required_subjects = curr_res.scalars().all()

    if not required_subjects:
        # Fallback: use subjects the student already has grades for
        grade_subj_res = await db.execute(
            select(Subject)
            .join(Grade, Grade.subject_id == Subject.id)
            .where(
                Grade.student_id == student_id,
                Grade.exam_id == exam_id
            )
            .distinct()
        )
        required_subjects = grade_subj_res.scalars().all()

    # 3. Load all grades for this student for the specific exam
    grades_res = await db.execute(
        select(Grade).where(
            Grade.student_id == student_id,
            Grade.exam_id == exam_id
        )
    )
    all_grades: List[Grade] = grades_res.scalars().all()

    # Build a map: subject_id → most recent grade for this exam (in case of multiple entries for same subject/exam, though unlikely)
    subject_grade_map: dict[int, Grade] = {}
    for g in sorted(all_grades, key=lambda x: x.id):
        # Later entries overwrite earlier
        subject_grade_map[g.subject_id] = g

    # 4. Determine failure grade label from configured scale
    failure_grade = await _get_failure_grade_label(db)

    # 5. Build per-subject results
    subject_results: List[SubjectResult] = []
    failed_subjects: List[FailedSubject] = []
    missing_subjects: List[MissingSubject] = []
    has_incomplete = False
    has_fail = False

    total_obtained = 0.0
    total_max = 0.0

    for subj in required_subjects:
        grade = subject_grade_map.get(subj.id)

        if grade is None:
            has_incomplete = True
            missing_subjects.append(MissingSubject(
                subject_id=subj.id,
                subject_name=subj.name
            ))
            subject_results.append(SubjectResult(
                subject_id=subj.id,
                subject_name=subj.name,
                status="MISSING"
            ))
            continue

        # Percentage — use stored value if available, else compute
        # * 100 is a mathematical percentage-conversion constant
        if grade.percentage is not None:
            pct = grade.percentage
        elif grade.total_marks and grade.total_marks > 0:
            pct = (grade.marks_obtained / grade.total_marks) * 100
        else:
            pct = 0.0

        # Recalculate letter grade from the CURRENT scale (not stored value)
        # This ensures admin scale changes immediately affect results
        letter = await calculate_letter_grade(pct, db)

        is_fail = (letter == failure_grade)
        if is_fail:
            has_fail = True
            failed_subjects.append(FailedSubject(
                subject_id=subj.id,
                subject_name=subj.name,
                marks_obtained=grade.marks_obtained,
                total_marks=grade.total_marks,
                percentage=round(pct, 2),
                letter_grade=letter
            ))

        total_obtained += grade.marks_obtained
        total_max += grade.total_marks

        subject_results.append(SubjectResult(
            subject_id=subj.id,
            subject_name=subj.name,
            marks_obtained=grade.marks_obtained,
            total_marks=grade.total_marks,
            percentage=round(pct, 2),
            letter_grade=letter,
            status="FAIL" if is_fail else "PASS"
        ))

    # 6. Overall percentage — mathematical constant * 100, not configurable
    if total_max > 0:
        overall_pct = (total_obtained / total_max) * 100
    else:
        overall_pct = 0.0

    # 7. Overall grade from current scale
    overall_grade = await calculate_letter_grade(overall_pct, db) if total_max > 0 else "N/A"

    # 8. Overall result
    if has_incomplete:
        overall_result = "INCOMPLETE"
    elif has_fail:
        overall_result = "FAIL"
    else:
        overall_result = "PASS"

    # If no subjects at all, result is INCOMPLETE
    if not required_subjects:
        overall_result = "INCOMPLETE"
        overall_grade = "N/A"

    return OverallResult(
        student_id=student_id,
        total_marks=round(total_obtained, 2),
        total_max_marks=round(total_max, 2),
        percentage=round(overall_pct, 2),
        overall_grade=overall_grade,
        overall_result=overall_result,
        subjects=subject_results,
        failed_subjects=failed_subjects,
        missing_subjects=missing_subjects,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/me", response_model=OverallResult)
async def get_my_result(
    exam_id: int,
    current_user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db)
):
    """Student fetches their own overall result for a specific exam."""
    student = await get_current_student(current_user=current_user, db=db)
    return await _compute_result(student.id, exam_id, db)


@router.get("/student/{student_id}", response_model=OverallResult)
async def get_student_result(
    student_id: int,
    exam_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin/Teacher: fetch any student's result for an exam.
    Student: can only fetch their own result.
    """
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        if student.id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students can only view their own result"
            )
    return await _compute_result(student_id, exam_id, db)
