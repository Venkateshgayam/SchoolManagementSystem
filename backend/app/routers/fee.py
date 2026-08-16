from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.database.database import get_db
from app.models.fee import Fee, FeeStatusEnum
from app.models.student import Student
from app.models.class_model import Class
from app.schemas.fee import FeeCreate, FeeUpdate, FeeResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/fees", tags=["fees"])


from app.core.settings import get_setting
from datetime import datetime, timedelta

async def _populate_amount_due(fee: Fee, db: AsyncSession) -> FeeResponse:
    total_fee = 0.0
    amount_due = 0.0
    if fee.student and fee.student.class_ref:
        base_fee = fee.student.class_ref.fee_amount or 0.0
        waiver = fee.waiver_percentage or 0.0
        total_fee = base_fee * (1 - waiver / 100)
        
    late_fee_applied = 0.0
    if fee.due_date and fee.amount_paid < total_fee:
        grace_period = await get_setting(db, "late_fee_grace_period_days", 7)
        if datetime.utcnow().date() > fee.due_date + timedelta(days=int(grace_period)):
            late_fee_type = await get_setting(db, "late_fee_type", "flat")
            late_fee_amount = await get_setting(db, "late_fee_amount", 15)
            
            if late_fee_type == "percentage":
                late_fee_applied = total_fee * (float(late_fee_amount) / 100)
            else:
                late_fee_applied = float(late_fee_amount)
                
            total_fee += late_fee_applied
    
    amount_due = max(0.0, total_fee - fee.amount_paid)
    
    # Auto-calculate status
    if fee.amount_paid >= total_fee and total_fee > 0:
        fee.status = FeeStatusEnum.PAID
    elif fee.due_date and datetime.utcnow().date() > fee.due_date and amount_due > 0:
        fee.status = FeeStatusEnum.OVERDUE
    elif fee.amount_paid > 0:
        fee.status = FeeStatusEnum.PARTIAL
    else:
        fee.status = FeeStatusEnum.PENDING

    return FeeResponse(
        id=fee.id,
        student_id=fee.student_id,
        student_user_id=fee.student.user_id if fee.student else None,
        waiver_percentage=fee.waiver_percentage,
        total_fee=total_fee,
        amount_paid=fee.amount_paid,
        amount_due=amount_due,
        late_fee_applied=late_fee_applied,
        due_date=fee.due_date,
        paid_date=fee.paid_date,
        status=fee.status,
        academic_year=fee.academic_year,
        created_at=fee.created_at,
        updated_at=fee.updated_at
    )


@router.get("/", response_model=List[FeeResponse])
async def list_fees(
    status: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "student")),
    db: AsyncSession = Depends(get_db)):
    query = select(Fee).options(selectinload(Fee.student).selectinload(Student.class_ref))
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(query.where(Fee.student_id == student.id))
    else:
        result = await db.execute(query)
    fees = result.scalars().all()
    populated_fees = [await _populate_amount_due(f, db) for f in fees]
    if status:
        st = status.upper()
        if st == "OVERDUE":
            today = datetime.utcnow().date()
            return [f for f in populated_fees if f.status == FeeStatusEnum.OVERDUE or (f.due_date and f.due_date < today and f.status != FeeStatusEnum.PAID)]
        elif st == "UNPAID":
            return [f for f in populated_fees if f.status == FeeStatusEnum.PENDING]
        else:
            return [f for f in populated_fees if f.status == st]
    return populated_fees


@router.get("/{fee_id}", response_model=FeeResponse)
async def get_fee(
    fee_id: int,
    current_user: dict = Depends(require_role("admin", "student")),
    db: AsyncSession = Depends(get_db)):
    query = select(Fee).options(selectinload(Fee.student).selectinload(Student.class_ref)).where(Fee.id == fee_id)
    result = await db.execute(query)
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
    if current_user.get("role") == "student" and fee.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await _populate_amount_due(fee, db)


@router.post("/", response_model=FeeResponse)
async def create_fee(
    request: FeeCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    current_academic_year = await get_setting(db, "current_academic_year", "2026-27")
    if request.academic_year != current_academic_year:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Fee records can only be created for the current academic year ({current_academic_year}).")

    # Check if student exists to populate amount_due later
    result = await db.execute(select(Student).options(selectinload(Student.class_ref)).where(Student.id == request.student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    fee = Fee(**request.model_dump(exclude_unset=True))
    db.add(fee)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A fee record already exists for this student in this academic year.")
    await db.refresh(fee)
    
    fee.student = student
    resp = await _populate_amount_due(fee, db)
    fee.status = resp.status
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Fee",
        entity_id=fee.id,
        description=f"Created fee record for student {fee.student_id}")
    
    return resp


@router.put("/{fee_id}", response_model=FeeResponse)
async def update_fee(
    fee_id: int,
    request: FeeUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    query = select(Fee).options(selectinload(Fee.student).selectinload(Student.class_ref)).where(Fee.id == fee_id)
    result = await db.execute(query)
    fee = result.scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
        
    update_data = request.model_dump(exclude_unset=True)
    
    if current_user.get("role") in ["admin"] and "waiver_percentage" in update_data:
        fee.waiver_percentage = update_data["waiver_percentage"]
        
    if "payment_amount" in update_data:
        fee.amount_paid += update_data["payment_amount"]
        if "paid_date" in update_data:
            fee.paid_date = update_data["paid_date"]
            
    if "due_date" in update_data:
        fee.due_date = update_data["due_date"]
    if "academic_year" in update_data:
        fee.academic_year = update_data["academic_year"]

    resp = await _populate_amount_due(fee, db)
    fee.status = resp.status
    
    await db.commit()
    await db.refresh(fee)

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Fee",
        entity_id=fee.id,
        description=f"Updated fee record {fee.id}")

    return resp


@router.delete("/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee(
    fee_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
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
        description=f"Deleted fee record {fee_id}")
    await db.commit()