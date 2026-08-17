from typing import List, Optional
from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.schedule import Schedule
from app.models.subject import Subject
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.teacher_class_assignment import TeacherClassAssignment
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student
from app.core.settings import get_setting

router = APIRouter(prefix="/schedules", tags=["schedules"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

LUNCH_START = time(12, 0)
LUNCH_END = time(13, 0)
MIN_START_TIME = time(9, 0)
MAX_END_TIME = time(17, 0)


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
    sched_res = await db.execute(
        select(Schedule.class_id).where(Schedule.teacher_id == teacher.id)
    )
    sched_ids = set(sched_res.scalars().all())
    return assigned_ids | homeroom_ids | sched_ids


def _validate_timings_and_lunch_break(start_t: time, end_t: time):
    if start_t >= end_t:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )
    if start_t < MIN_START_TIME or end_t > MAX_END_TIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class timings must be between 09:00 and 17:00 (9:00 AM - 5:00 PM)"
        )
    # Check if overlapping with lunch break (12:00 - 13:00)
    overlap_start = max(start_t, LUNCH_START)
    overlap_end = min(end_t, LUNCH_END)
    if overlap_start < overlap_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="12:00 PM - 1:00 PM is reserved for Lunch Break. Schedule entries cannot overlap with the lunch window."
        )
    # Must be entirely in morning (end_t <= 12:00) or entirely in afternoon (start_t >= 13:00)
    if not (end_t <= LUNCH_START or start_t >= LUNCH_END):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class timing must be either in morning session (09:00 - 12:00) or afternoon session (13:00 - 17:00)"
        )


async def _validate_schedule_conflicts(
    db: AsyncSession,
    class_id: int,
    subject_id: int,
    teacher_id: Optional[int],
    day_of_week: int,
    start_t: time,
    end_t: time,
    exclude_schedule_id: Optional[int] = None
):
    # 1. Check class conflict: Same class cannot have overlapping schedules
    query_class = (
        select(Schedule)
        .options(selectinload(Schedule.subject), selectinload(Schedule.teacher).selectinload(Teacher.user))
        .where(
            Schedule.class_id == class_id,
            Schedule.day_of_week == day_of_week,
        )
    )
    if exclude_schedule_id:
        query_class = query_class.where(Schedule.id != exclude_schedule_id)

    res_class = await db.execute(query_class)
    existing_class_schedules = res_class.scalars().all()

    for s in existing_class_schedules:
        overlap_s = max(s.start_time, start_t)
        overlap_e = min(s.end_time, end_t)
        if overlap_s < overlap_e:
            subj_name = s.subject.name if s.subject else "another subject"
            day_name = DAY_NAMES[day_of_week] if 0 <= day_of_week < len(DAY_NAMES) else f"Day {day_of_week}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This class already has {subj_name} scheduled from {s.start_time.strftime('%H:%M')} to {s.end_time.strftime('%H:%M')} on {day_name}."
            )

    # 2. Check teacher conflict: Same teacher cannot be booked in two classes at overlapping times
    if teacher_id is not None:
        query_teacher = (
            select(Schedule)
            .options(
                selectinload(Schedule.class_ref),
                selectinload(Schedule.teacher).selectinload(Teacher.user),
                selectinload(Schedule.subject)
            )
            .where(
                Schedule.teacher_id == teacher_id,
                Schedule.day_of_week == day_of_week,
            )
        )
        if exclude_schedule_id:
            query_teacher = query_teacher.where(Schedule.id != exclude_schedule_id)

        res_teacher = await db.execute(query_teacher)
        existing_teacher_schedules = res_teacher.scalars().all()

        for s in existing_teacher_schedules:
            overlap_s = max(s.start_time, start_t)
            overlap_e = min(s.end_time, end_t)
            if overlap_s < overlap_e:
                t_user = s.teacher.user if s.teacher and s.teacher.user else None
                teacher_name = t_user.full_name or f"Teacher #{teacher_id}"
                c_name = f"{s.class_ref.name} {s.class_ref.section or ''}".strip() if s.class_ref else f"Class #{s.class_id}"
                day_name = DAY_NAMES[day_of_week] if 0 <= day_of_week < len(DAY_NAMES) else f"Day {day_of_week}"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Teacher {teacher_name} is already scheduled for {c_name} from {s.start_time.strftime('%H:%M')} to {s.end_time.strftime('%H:%M')} on {day_name}."
                )


@router.get("/", response_model=List[ScheduleResponse])
async def list_schedules(
    class_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    day_of_week: Optional[int] = None,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    query = select(Schedule).options(
        selectinload(Schedule.class_ref),
        selectinload(Schedule.subject),
        selectinload(Schedule.teacher).selectinload(Teacher.user),
    )

    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        if student and student.class_id:
            query = query.where(Schedule.class_id == student.class_id)
        else:
            return []
    elif role == "teacher":
        teacher = (
            await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
        ).scalar_one_or_none()
        if teacher:
            class_ids = await _teacher_class_ids(db, current_user)
            query = query.where(
                or_(
                    Schedule.teacher_id == teacher.id,
                    Schedule.class_id.in_(class_ids) if class_ids else False
                )
            )
        else:
            return []
    
    if class_id:
        query = query.where(Schedule.class_id == class_id)
    if teacher_id:
        query = query.where(Schedule.teacher_id == teacher_id)
    if day_of_week is not None:
        query = query.where(Schedule.day_of_week == day_of_week)

    query = query.order_by(Schedule.day_of_week, Schedule.start_time)
    result = await db.execute(query)
    schedules = result.scalars().all()
    return schedules


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Schedule)
        .options(
            selectinload(Schedule.class_ref),
            selectinload(Schedule.subject),
            selectinload(Schedule.teacher).selectinload(Teacher.user),
        )
        .where(Schedule.id == schedule_id)
    )
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
        teacher = (
            await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
        ).scalar_one_or_none()
        if schedule.class_id not in class_ids and (not teacher or schedule.teacher_id != teacher.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return schedule


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
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
                data["day_of_week"] = parsed_date.weekday()
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD")
                
    if "day_of_week" not in data or data["day_of_week"] is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date or day_of_week is required")
    
    # 3. Validate start_time and end_time (lunch break rule, 09:00-17:00)
    _validate_timings_and_lunch_break(data["start_time"], data["end_time"])

    # 4. Check for class and teacher conflicts
    await _validate_schedule_conflicts(
        db,
        class_id=data["class_id"],
        subject_id=data["subject_id"],
        teacher_id=data.get("teacher_id"),
        day_of_week=data["day_of_week"],
        start_t=data["start_time"],
        end_t=data["end_time"],
    )

    # 5. Teacher Assignment validation / warning
    if "teacher_id" in data and data["teacher_id"] is not None:
        teacher = (
            await db.execute(select(Teacher).where(Teacher.id == data["teacher_id"]))
        ).scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

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
    
    if "date" in update_data:
        date_str = update_data.pop("date")
        if date_str:
            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                update_data["day_of_week"] = parsed_date.weekday()
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD")
                
    if "academic_year" in update_data:
        update_data.pop("academic_year")

    target_class_id = update_data.get("class_id", schedule.class_id)
    target_subject_id = update_data.get("subject_id", schedule.subject_id)
    target_teacher_id = update_data.get("teacher_id", schedule.teacher_id)
    target_day = update_data.get("day_of_week", schedule.day_of_week)
    target_start = update_data.get("start_time", schedule.start_time)
    target_end = update_data.get("end_time", schedule.end_time)

    # Validate timings & lunch break
    _validate_timings_and_lunch_break(target_start, target_end)

    # Validate conflicts
    await _validate_schedule_conflicts(
        db,
        class_id=target_class_id,
        subject_id=target_subject_id,
        teacher_id=target_teacher_id,
        day_of_week=target_day,
        start_t=target_start,
        end_t=target_end,
        exclude_schedule_id=schedule.id,
    )

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