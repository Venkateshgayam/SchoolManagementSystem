from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.schedule import Schedule
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student
from app.core.settings import get_setting
from datetime import datetime

router = APIRouter(prefix="/schedules", tags=["schedules"])


async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    return set(result.scalars().all())


@router.get("/", response_model=List[ScheduleResponse])
async def list_schedules(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Schedule).where(Schedule.class_id == student.class_id))
    elif role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if not class_ids:
            return []
        result = await db.execute(select(Schedule).where(Schedule.class_id.in_(class_ids)))
    else:
        result = await db.execute(select(Schedule))
    schedules = result.scalars().all()
    return schedules


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        if schedule.class_id != student.class_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if schedule.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return schedule


@router.post("/", response_model=ScheduleResponse)
async def create_schedule(
    request: ScheduleCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    data = request.model_dump(exclude_unset=True)
    
    # 1. Enforce Academic Year from Settings
    current_academic_year = await get_setting(db, "current_academic_year", "2026-27")
    data["academic_year"] = current_academic_year
    
    # 2. Derive day_of_week from date if provided
    if "date" in data:
        date_str = data.pop("date")
        if date_str:
            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                data["day_of_week"] = parsed_date.weekday()  # 0=Monday, 6=Sunday
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD")
                
    if "day_of_week" not in data or data["day_of_week"] is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date or day_of_week is required")
        
    schedule = Schedule(**data)
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    request: ScheduleUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
        
    update_data = request.model_dump(exclude_unset=True)
    
    # Enforce derived day_of_week if date is provided
    if "date" in update_data:
        date_str = update_data.pop("date")
        if date_str:
            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                update_data["day_of_week"] = parsed_date.weekday()
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD")
                
    # Do not allow modifying academic_year manually via update unless it's a specific system requirement
    # We will ignore academic_year if sent in update to preserve existing schedule
    if "academic_year" in update_data:
        update_data.pop("academic_year")
        
    for key, value in update_data.items():
        setattr(schedule, key, value)
        
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    await db.delete(schedule)
    await db.commit()