from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.exam import Exam
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.core.dependencies import require_role
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("/", response_model=List[ExamResponse])
async def list_exams(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)))
    exams = result.scalars().all()
    return exams


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return exam


@router.post("/", response_model=ExamResponse)
async def create_exam(
    request: ExamCreate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.exam import ExamSubjectSlot
    exam_data = request.model_dump(exclude_unset=True)
    slots_data = exam_data.pop("slots", [])
    
    exam = Exam(**exam_data)
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    
    if slots_data:
        for slot in slots_data:
            new_slot = ExamSubjectSlot(
                exam_id=exam.id,
                **slot
            )
            db.add(new_slot)
        await db.commit()
    
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam.id))
    exam = result.scalar_one_or_none()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Exam",
        entity_id=exam.id,
        description=f"Created exam {exam.name}",
    )
    await db.commit()

    return exam


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    request: ExamUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.exam import ExamSubjectSlot
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        
    update_data = request.model_dump(exclude_unset=True)
    slots_data = update_data.pop("slots", None)
    
    for key, value in update_data.items():
        setattr(exam, key, value)
        
    if slots_data is not None:
        # Simplest approach: Delete existing slots and recreate
        await db.execute(ExamSubjectSlot.__table__.delete().where(ExamSubjectSlot.exam_id == exam.id))
        for slot in slots_data:
            new_slot = ExamSubjectSlot(
                exam_id=exam.id,
                **slot
            )
            db.add(new_slot)
            
    await db.commit()
    
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam.id))
    exam = result.scalar_one_or_none()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Exam",
        entity_id=exam.id,
        description=f"Updated exam {exam.name}",
    )
    await db.commit()

    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    await db.delete(exam)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Exam",
        entity_id=exam_id,
        description=f"Deleted exam {exam_id}",
    )
    await db.commit()