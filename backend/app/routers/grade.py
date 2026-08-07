from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.grade import Grade
from app.models.student import Student
from app.schemas.grade import GradeCreate, GradeUpdate, GradeResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student

router = APIRouter(prefix="/grades", tags=["grades"])


@router.get("/", response_model=List[GradeResponse])
async def list_grades(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Grade).where(Grade.student_id == student.id))
    else:
        result = await db.execute(select(Grade))
    grades = result.scalars().all()
    return grades


@router.get("/{grade_id}", response_model=GradeResponse)
async def get_grade(
    grade_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Grade).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    if current_user.get("role") == "student" and grade.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return grade


@router.post("/", response_model=GradeResponse)
async def create_grade(
    request: GradeCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    grade = Grade(**request.model_dump(exclude_unset=True))
    db.add(grade)
    await db.commit()
    await db.refresh(grade)
    return grade


@router.put("/{grade_id}", response_model=GradeResponse)
async def update_grade(
    grade_id: int,
    request: GradeUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Grade).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(grade, key, value)
    await db.commit()
    await db.refresh(grade)
    return grade


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    grade_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Grade).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    await db.delete(grade)
    await db.commit()