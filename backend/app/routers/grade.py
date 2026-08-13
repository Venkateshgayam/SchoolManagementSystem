from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.grade import Grade
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.schemas.grade import GradeCreate, GradeUpdate, GradeResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student

router = APIRouter(prefix="/grades", tags=["grades"])

from app.core.settings import get_setting

async def calculate_letter_grade(percentage: float, db: AsyncSession) -> str:
    scale = await get_setting(db, "grading_scale", None)
    if not scale or not isinstance(scale, list):
        scale = [{"grade":"A","min_percent":90},{"grade":"B","min_percent":80},{"grade":"C","min_percent":70},{"grade":"D","min_percent":60},{"grade":"F","min_percent":0}]
    
    try:
        scale = sorted(scale, key=lambda x: x.get("min_percent", 0), reverse=True)
    except:
        pass
        
    for entry in scale:
        if percentage >= entry.get("min_percent", 0):
            return entry.get("grade", "F")
    return "F"

async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    return set(result.scalars().all())


@router.get("/", response_model=List[GradeResponse])
async def list_grades(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Grade).options(selectinload(Grade.subject)).where(Grade.student_id == student.id))
    elif role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if not class_ids:
            return []
        student_ids_result = await db.execute(
            select(Student.id).where(Student.class_id.in_(class_ids))
        )
        student_ids = set(student_ids_result.scalars().all())
        if not student_ids:
            return []
        result = await db.execute(select(Grade).options(selectinload(Grade.subject)).where(Grade.student_id.in_(student_ids)))
    else:
        result = await db.execute(select(Grade).options(selectinload(Grade.subject)))
    grades = result.scalars().all()
    return grades


@router.get("/{grade_id}", response_model=GradeResponse)
async def get_grade(
    grade_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Grade).options(selectinload(Grade.subject)).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    role = current_user.get("role")
    if role == "student" and grade.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        student = (
            await db.execute(select(Student).where(Student.id == grade.student_id))
        ).scalar_one_or_none()
        if not student or student.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return grade


@router.post("/", response_model=GradeResponse)
async def create_grade(
    request: GradeCreate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    if not request.exam_id:
        raise HTTPException(status_code=400, detail="exam_id is required")
        
    if request.marks_obtained > request.total_marks:
        raise HTTPException(status_code=400, detail="Marks obtained cannot be greater than total marks")
        
    if current_user.get("role") == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        student = (
            await db.execute(select(Student).where(Student.id == request.student_id))
        ).scalar_one_or_none()
        if not student or student.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot grade student not in your assigned classes")
            
    # Check if a grade already exists for this combination
    existing_result = await db.execute(
        select(Grade).options(selectinload(Grade.subject)).where(
            Grade.student_id == request.student_id,
            Grade.subject_id == request.subject_id,
            Grade.exam_id == request.exam_id
        )
    )
    existing_grade = existing_result.scalar_one_or_none()
    
    # Calculate percentage and letter grade
    percentage = getattr(request, "percentage", None)
    if percentage is None:
        percentage = (request.marks_obtained / request.total_marks) * 100
    letter_grade = await calculate_letter_grade(percentage, db)

    if existing_grade:
        # Update existing grade instead of creating duplicate
        existing_grade.marks_obtained = request.marks_obtained
        existing_grade.total_marks = request.total_marks
        existing_grade.percentage = percentage
        existing_grade.letter_grade = letter_grade
        if request.created_by:
            existing_grade.created_by = request.created_by
        grade = existing_grade
    else:
        # Insert new grade
        grade_data = request.model_dump(exclude_unset=True)
        grade_data["percentage"] = percentage
        grade_data["letter_grade"] = letter_grade
        grade = Grade(**grade_data)
        db.add(grade)
        
    await db.commit()
    await db.refresh(grade)
    return grade


@router.put("/{grade_id}", response_model=GradeResponse)
async def update_grade(
    grade_id: int,
    request: GradeUpdate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Grade).options(selectinload(Grade.subject)).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
        
    if current_user.get("role") == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        student = (
            await db.execute(select(Student).where(Student.id == grade.student_id))
        ).scalar_one_or_none()
        if not student or student.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot grade student not in your assigned classes")
            
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(grade, key, value)
        
    if grade.marks_obtained > grade.total_marks:
        raise HTTPException(status_code=400, detail="Marks obtained cannot be greater than total marks")
    
    # Recalculate percentage and letter grade on update
    percentage = getattr(grade, "percentage", None)
    if percentage is None:
        percentage = (grade.marks_obtained / grade.total_marks) * 100
    grade.percentage = percentage
    grade.letter_grade = await calculate_letter_grade(percentage, db)
    
    await db.commit()
    await db.refresh(grade)
    return grade


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    grade_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Grade).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    await db.delete(grade)
    await db.commit()