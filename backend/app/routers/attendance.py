from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/attendance", tags=["attendance"])


async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    return set(result.scalars().all())


@router.get("/", response_model=List[AttendanceResponse])
async def list_attendance(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Attendance).where(Attendance.student_id == student.id))
    elif role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if not class_ids:
            return []
        # Get student IDs in the teacher's classes
        student_ids_result = await db.execute(
            select(Student.id).where(Student.class_id.in_(class_ids))
        )
        student_ids = set(student_ids_result.scalars().all())
        if not student_ids:
            return []
        result = await db.execute(select(Attendance).where(Attendance.student_id.in_(student_ids)))
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
    role = current_user.get("role")
    if role == "student" and record.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        student = (
            await db.execute(select(Student).where(Student.id == record.student_id))
        ).scalar_one_or_none()
        if not student or student.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return record


@router.post("/", response_model=AttendanceResponse)
async def create_attendance(
    request: AttendanceCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management")),
    db: AsyncSession = Depends(get_db),
):
    record = Attendance(**request.model_dump(exclude_unset=True))
    db.add(record)
    await db.commit()
    await db.refresh(record)

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Attendance",
        entity_id=record.id,
        description=f"Created attendance record for student {record.student_id}",
    )
    await db.commit()

    return record


@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    request: AttendanceUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management")),
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

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Attendance",
        entity_id=record.id,
        description=f"Updated attendance record {record.id}",
    )
    await db.commit()

    return record


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    attendance_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    await db.delete(record)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Attendance",
        entity_id=attendance_id,
        description=f"Deleted attendance record {attendance_id}",
    )
    await db.commit()