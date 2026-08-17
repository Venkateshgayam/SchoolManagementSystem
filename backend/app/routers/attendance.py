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


from app.models.holiday import Holiday
from app.models.teacher_class_assignment import TeacherClassAssignment

async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    assigned_res = await db.execute(
        select(TeacherClassAssignment.class_id).where(TeacherClassAssignment.teacher_id == teacher.id)
    )
    assigned_ids = set(assigned_res.scalars().all())
    homeroom_res = await db.execute(
        select(Class.id).where(Class.teacher_id == teacher.id)
    )
    homeroom_ids = set(homeroom_res.scalars().all())
    return assigned_ids | homeroom_ids


import calendar
from datetime import datetime, date as dt_date
from sqlalchemy import or_


async def calculate_attendance_stats_db(
    db: AsyncSession,
    student_id: Optional[int] = None,
    class_id: Optional[int] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict:
    """
    Calculates attendance statistics excluding Sundays, recurring weekday holidays,
    and specific-date holidays for the relevant class or school-wide.
    """
    att_query = select(Attendance)
    if student_id:
        att_query = att_query.where(Attendance.student_id == student_id)
    if class_id:
        att_query = att_query.where(Attendance.class_id == class_id)
    if month:
        try:
            parts = month.split("-")
            y, m = int(parts[0]), int(parts[1])
            _, last_day = calendar.monthrange(y, m)
            att_query = att_query.where(Attendance.date >= f"{y:04d}-{m:02d}-01", Attendance.date <= f"{y:04d}-{m:02d}-{last_day:02d}")
        except Exception:
            pass
    if start_date:
        att_query = att_query.where(Attendance.date >= start_date)
    if end_date:
        att_query = att_query.where(Attendance.date <= end_date)

    att_result = await db.execute(att_query)
    records = att_result.scalars().all()

    # Fetch holidays (school-wide + class-specific)
    hol_query = select(Holiday)
    if class_id:
        hol_query = hol_query.where(or_(Holiday.class_id.is_(None), Holiday.class_id == class_id))
    hol_result = await db.execute(hol_query)
    holidays = hol_result.scalars().all()

    recurring_days = {h.day.capitalize() for h in holidays if h.type == "recurring" and h.day}
    specific_dates = {h.date.isoformat() if hasattr(h.date, "isoformat") else str(h.date) for h in holidays if h.type == "specific" and h.date}

    unique_records = {}
    for r in records:
        d_str = r.date.isoformat() if hasattr(r.date, "isoformat") else str(r.date)
        try:
            parsed_d = datetime.strptime(d_str, "%Y-%m-%d").date()
        except Exception:
            parsed_d = None

        # Exclude Sundays (weekday 6 in python: 0=Mon, ..., 6=Sun)
        if parsed_d and parsed_d.weekday() == 6:
            continue
        # Exclude recurring weekday holidays
        if parsed_d and parsed_d.strftime("%A") in recurring_days:
            continue
        # Exclude specific holiday dates
        if d_str in specific_dates:
            continue

        key = (r.student_id, d_str)
        status_val = (r.status or "").lower()
        if key not in unique_records:
            unique_records[key] = status_val
        else:
            existing = unique_records[key]
            if existing == "absent" and (status_val in ["present", "late"]):
                unique_records[key] = status_val
            elif existing == "late" and status_val == "present":
                unique_records[key] = status_val

    present = sum(1 for s in unique_records.values() if s == "present")
    late = sum(1 for s in unique_records.values() if s == "late")
    absent = sum(1 for s in unique_records.values() if s == "absent")
    total = present + late + absent
    rate = round(((present + late) / total) * 100, 2) if total > 0 else 0.0

    return {
        "total": total,
        "present": present,
        "late": late,
        "absent": absent,
        "rate": rate,
    }


@router.get("/stats")
async def get_attendance_stats(
    student_id: Optional[int] = None,
    class_id: Optional[int] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        student_id = student.id
        class_id = student.class_id
    elif role == "teacher" and class_id:
        class_ids = await _teacher_class_ids(db, current_user)
        if class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return await calculate_attendance_stats_db(
        db=db,
        student_id=student_id,
        class_id=class_id,
        month=month,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/", response_model=List[AttendanceResponse])
async def list_attendance(
    month: Optional[str] = None,
    date: Optional[str] = None,
    class_id: Optional[int] = None,
    student_id: Optional[int] = None,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    query = select(Attendance)

    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        query = query.where(Attendance.student_id == student.id)
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
        query = query.where(Attendance.student_id.in_(student_ids))

    if class_id:
        query = query.where(Attendance.class_id == class_id)
    if student_id:
        query = query.where(Attendance.student_id == student_id)
    if date:
        query = query.where(Attendance.date == date)
    if month:
        try:
            parts = month.split("-")
            year = int(parts[0])
            m = int(parts[1])
            _, last_day = calendar.monthrange(year, m)
            start_date = f"{year:04d}-{m:02d}-01"
            end_date = f"{year:04d}-{m:02d}-{last_day:02d}"
            query = query.where(Attendance.date >= start_date, Attendance.date <= end_date)
        except Exception:
            pass

    result = await db.execute(query)
    records = result.scalars().all()
    return records


@router.get("/{attendance_id}", response_model=AttendanceResponse)
async def get_attendance(
    attendance_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
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
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    
    if current_user.get("role") == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        student = (
            await db.execute(select(Student).where(Student.id == request.student_id))
        ).scalar_one_or_none()
        if not student or student.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot mark attendance for student not in your assigned classes")
            
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
        description=f"Created attendance record for student {record.student_id}")
    await db.commit()

    return record


@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    request: AttendanceUpdate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
        
    if current_user.get("role") == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        student = (
            await db.execute(select(Student).where(Student.id == record.student_id))
        ).scalar_one_or_none()
        if not student or student.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify attendance for student not in your assigned classes")
            
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
        description=f"Updated attendance record {record.id}")
    await db.commit()

    return record


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    attendance_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
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
        description=f"Deleted attendance record {attendance_id}")
    await db.commit()