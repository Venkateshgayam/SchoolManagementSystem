from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.fee import Fee, FeeStatusEnum
from app.models.student import Student
from app.models.class_model import Class
from app.schemas.fee import FeeCreate, FeeUpdate, FeeResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/fees", tags=["fees"])


def _populate_amount_due(fee: Fee) -> FeeResponse:
    total_fee = 0.0
    amount_due = 0.0
    if fee.student and fee.student.class_ref:
        base_fee = fee.student.class_ref.fee_amount or 0.0
        waiver = fee.waiver_percentage or 0.0
        total_fee = base_fee * (1 - waiver / 100)
    
    amount_due = max(0.0, total_fee - fee.amount_paid)
    
    # Auto-calculate status
    if fee.amount_paid >= total_fee and total_fee > 0:
        fee.status = FeeStatusEnum.paid
    elif fee.amount_paid > 0:
        fee.status = FeeStatusEnum.partial
    else:
        fee.status = FeeStatusEnum.unpaid

    return FeeResponse(
        id=fee.id,
        student_id=fee.student_id,
        student_user_id=fee.student.user_id if fee.student else None,
        waiver_percentage=fee.waiver_percentage,
        total_fee=total_fee,
        amount_paid=fee.amount_paid,
        amount_due=amount_due,
        due_date=fee.due_date,
        paid_date=fee.paid_date,
        status=fee.status,
        academic_year=fee.academic_year,
        created_at=fee.created_at,
        updated_at=fee.updated_at
    )


@router.get("/", response_model=List[FeeResponse])
async def list_fees(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    query = select(Fee).options(selectinload(Fee.student).selectinload(Student.class_ref))
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(query.where(Fee.student_id == student.id))
    else:
        result = await db.execute(query)
    fees = result.scalars().all()
    return [_populate_amount_due(f) for f in fees]


@router.get("/{fee_id}", response_model=FeeResponse)
async def get_fee(
    fee_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    query = select(Fee).options(selectinload(Fee.student).selectinload(Student.class_ref)).where(Fee.id == fee_id)
    result = await db.execute(query)
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
    if current_user.get("role") == "student" and fee.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return _populate_amount_due(fee)


@router.post("/", response_model=FeeResponse)
async def create_fee(
    request: FeeCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    # Check if student exists to populate amount_due later
    result = await db.execute(select(Student).options(selectinload(Student.class_ref)).where(Student.id == request.student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    fee = Fee(**request.model_dump(exclude_unset=True))
    db.add(fee)
    await db.commit()
    await db.refresh(fee)
    
    fee.student = student
    resp = _populate_amount_due(fee)
    fee.status = resp.status
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Fee",
        entity_id=fee.id,
        description=f"Created fee record for student {fee.student_id}",
    )
    
    return resp


@router.put("/{fee_id}", response_model=FeeResponse)
async def update_fee(
    fee_id: int,
    request: FeeUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    query = select(Fee).options(selectinload(Fee.student).selectinload(Student.class_ref)).where(Fee.id == fee_id)
    result = await db.execute(query)
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
        
    update_data = request.model_dump(exclude_unset=True)
    
    if current_user.get("role") in ["admin", "super_admin", "management"] and "waiver_percentage" in update_data:
        fee.waiver_percentage = update_data["waiver_percentage"]
        
    if "payment_amount" in update_data:
        fee.amount_paid += update_data["payment_amount"]
        if "paid_date" in update_data:
            fee.paid_date = update_data["paid_date"]
            
    if "due_date" in update_data:
        fee.due_date = update_data["due_date"]
    if "academic_year" in update_data:
        fee.academic_year = update_data["academic_year"]

    resp = _populate_amount_due(fee)
    fee.status = resp.status
    
    await db.commit()
    await db.refresh(fee)

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Fee",
        entity_id=fee.id,
        description=f"Updated fee record {fee.id}",
    )

    return resp


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

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Fee",
        entity_id=fee_id,
        description=f"Deleted fee record {fee_id}",
    )
    await db.commit()