from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.leave_request import LeaveRequest, LeaveRequestStatus
from app.models.student import Student
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student, get_current_teacher

router = APIRouter(prefix="/leave-requests", tags=["leave_requests"])


from datetime import datetime, timedelta
from app.core.settings import get_setting

async def _populate_exceeds_limit(requests: List[LeaveRequest], db: AsyncSession) -> List[LeaveRequestResponse]:
    if not requests:
        return []
        
    max_leave_days = int(await get_setting(db, "max_leave_days_per_term", 10))
    student_ids = [r.student_id for r in requests if r.student_id]
    teacher_ids = [r.teacher_id for r in requests if r.teacher_id]
    one_year_ago = datetime.utcnow().date() - timedelta(days=365)
    
    approved_leaves_query = select(LeaveRequest).where(
        LeaveRequest.status == LeaveRequestStatus.APPROVED,
        LeaveRequest.from_date >= one_year_ago
    )
    if student_ids and teacher_ids:
        approved_leaves_query = approved_leaves_query.where((LeaveRequest.student_id.in_(student_ids)) | (LeaveRequest.teacher_id.in_(teacher_ids)))
    elif student_ids:
        approved_leaves_query = approved_leaves_query.where(LeaveRequest.student_id.in_(student_ids))
    elif teacher_ids:
        approved_leaves_query = approved_leaves_query.where(LeaveRequest.teacher_id.in_(teacher_ids))
        
    result = await db.execute(approved_leaves_query)
    approved_leaves = result.scalars().all()
    
    student_totals = {}
    teacher_totals = {}
    for l in approved_leaves:
        days = (l.to_date - l.from_date).days + 1
        if l.student_id: student_totals[l.student_id] = student_totals.get(l.student_id, 0) + max(0, days)
        if l.teacher_id: teacher_totals[l.teacher_id] = teacher_totals.get(l.teacher_id, 0) + max(0, days)
            
    responses = []
    for r in requests:
        days = (r.to_date - r.from_date).days + 1
        total = student_totals.get(r.student_id, 0) if r.student_id else teacher_totals.get(r.teacher_id, 0)
        
        # If this request is not yet approved, add its days to see if it *would* exceed the limit
        if r.status != LeaveRequestStatus.APPROVED:
            total += max(0, days)
            
        exceeds = total > max_leave_days
        resp = LeaveRequestResponse.model_validate(r)
        resp.exceeds_limit = exceeds
        responses.append(resp)
        
    return responses

@router.get("/", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    current_user: dict = Depends(require_role("admin", "student", "teacher")),
    db: AsyncSession = Depends(get_db)):
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(LeaveRequest).where(LeaveRequest.student_id == student.id))
    elif current_user.get("role") == "teacher":
        teacher = await get_current_teacher(current_user=current_user, db=db)
        result = await db.execute(select(LeaveRequest).where(LeaveRequest.teacher_id == teacher.id))
    else:
        result = await db.execute(select(LeaveRequest))
    requests = result.scalars().all()
    return await _populate_exceeds_limit(requests, db)


@router.get("/{leave_id}", response_model=LeaveRequestResponse)
async def get_leave_request(
    leave_id: int,
    current_user: dict = Depends(require_role("admin", "student", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    if current_user.get("role") == "student" and leave.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.get("role") == "teacher" and leave.teacher_id != (await get_current_teacher(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return (await _populate_exceeds_limit([leave], db))[0]


@router.post("/", response_model=LeaveRequestResponse)
async def create_leave_request(
    request: LeaveRequestCreate,
    current_user: dict = Depends(require_role("student", "teacher")),
    db: AsyncSession = Depends(get_db)):
    data = request.model_dump(exclude_unset=True)
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        data["student_id"] = student.id
    elif current_user.get("role") == "teacher":
        teacher = await get_current_teacher(current_user=current_user, db=db)
        data["teacher_id"] = teacher.id
    leave = LeaveRequest(**data)
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return (await _populate_exceeds_limit([leave], db))[0]


@router.put("/{leave_id}", response_model=LeaveRequestResponse)
async def update_leave_request(
    leave_id: int,
    request: LeaveRequestUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(leave, key, value)
    await db.commit()
    await db.refresh(leave)
    return (await _populate_exceeds_limit([leave], db))[0]


@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leave_request(
    leave_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    await db.delete(leave)
    await db.commit()