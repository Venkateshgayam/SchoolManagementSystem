from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.fee import Fee
from app.models.student import Student
from app.schemas.fee import FeeCreate, FeeUpdate, FeeResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student

router = APIRouter(prefix="/fees", tags=["fees"])


@router.get("/", response_model=List[FeeResponse])
async def list_fees(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Fee).where(Fee.student_id == student.id))
    else:
        result = await db.execute(select(Fee))
    fees = result.scalars().all()
    return fees


@router.get("/{fee_id}", response_model=FeeResponse)
async def get_fee(
    fee_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Fee).where(Fee.id == fee_id))
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
    if current_user.get("role") == "student" and fee.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return fee


@router.post("/", response_model=FeeResponse)
async def create_fee(
    request: FeeCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    fee = Fee(**request.model_dump(exclude_unset=True))
    db.add(fee)
    await db.commit()
    await db.refresh(fee)
    return fee


@router.put("/{fee_id}", response_model=FeeResponse)
async def update_fee(
    fee_id: int,
    request: FeeUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Fee).where(Fee.id == fee_id))
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(fee, key, value)
    await db.commit()
    await db.refresh(fee)
    return fee


@router.delete("/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee(
    fee_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Fee).where(Fee.id == fee_id))
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
    await db.delete(fee)
    await db.commit()