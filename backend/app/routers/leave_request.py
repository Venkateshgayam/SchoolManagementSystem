from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.leave_request import LeaveRequest
from app.models.student import Student
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student, get_current_teacher

router = APIRouter(prefix="/leave-requests", tags=["leave_requests"])


@router.get("/", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "student", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(LeaveRequest).where(LeaveRequest.student_id == student.id))
    elif current_user.get("role") == "teacher":
        teacher = await get_current_teacher(current_user=current_user, db=db)
        result = await db.execute(select(LeaveRequest).where(LeaveRequest.teacher_id == teacher.id))
    else:
        result = await db.execute(select(LeaveRequest))
    requests = result.scalars().all()
    return requests


@router.get("/{leave_id}", response_model=LeaveRequestResponse)
async def get_leave_request(
    leave_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "student", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    if current_user.get("role") == "student" and leave.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.get("role") == "teacher" and leave.teacher_id != (await get_current_teacher(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return leave


@router.post("/", response_model=LeaveRequestResponse)
async def create_leave_request(
    request: LeaveRequestCreate,
    current_user: dict = Depends(require_role("student", "teacher")),
    db: AsyncSession = Depends(get_db),
):
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
    return leave


@router.put("/{leave_id}", response_model=LeaveRequestResponse)
async def update_leave_request(
    leave_id: int,
    request: LeaveRequestUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(leave, key, value)
    await db.commit()
    await db.refresh(leave)
    return leave


@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leave_request(
    leave_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    await db.delete(leave)
    await db.commit()