from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/", response_model=List[AttendanceResponse])
async def list_attendance(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Attendance).where(Attendance.student_id == student.id))
    else:
        result = await db.execute(select(Attendance))
    records = result.scalars().all()
    return records


@router.get("/{attendance_id}", response_model=AttendanceResponse)
async def get_attendance(
    attendance_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    if current_user.get("role") == "student" and record.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return record


@router.post("/", response_model=AttendanceResponse)
async def create_attendance(
    request: AttendanceCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    record = Attendance(**request.model_dump(exclude_unset=True))
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    request: AttendanceUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    attendance_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    await db.delete(record)
    await db.commit()