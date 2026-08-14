from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.schedule import Schedule
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.core.dependencies import require_role
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/subjects", tags=["subjects"])


async def _teacher_subject_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(
        select(Schedule.subject_id).where(Schedule.teacher_id == teacher.id)
    )
    return set(result.scalars().all())


@router.get("/", response_model=List[SubjectResponse])
async def list_subjects(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    if current_user.get("role") == "teacher":
        subject_ids = await _teacher_subject_ids(db, current_user)
        if not subject_ids:
            return []
        result = await db.execute(select(Subject).options(selectinload(Subject.teachers)).where(Subject.id.in_(subject_ids)))
    else:
        result = await db.execute(select(Subject).options(selectinload(Subject.teachers)))
    subjects = result.scalars().all()
    return subjects


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).options(selectinload(Subject.teachers)).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if current_user.get("role") == "teacher":
        subject_ids = await _teacher_subject_ids(db, current_user)
        if subject_id not in subject_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return subject


@router.post("/", response_model=SubjectResponse)
async def create_subject(
    request: SubjectCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    data = request.model_dump(exclude_unset=True)
    teacher_ids = data.pop("teacher_ids", [])
    
    subject = Subject(**data)
    
    if teacher_ids:
        teachers_result = await db.execute(
            select(Teacher).options(selectinload(Teacher.subjects)).where(Teacher.id.in_(teacher_ids))
        )
        teachers = list(teachers_result.scalars().all())
        for t in teachers:
            if t.subjects:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Teacher {t.id} is already assigned to subject '{t.subjects[0].name}'"
                )
        subject.teachers = teachers
        
    db.add(subject)
    await db.commit()
    await db.refresh(subject, ["teachers"])
    
    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Subject",
        entity_id=subject.id,
        description=f"Created subject {subject.name}")
    await db.commit()

    return subject


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    request: SubjectUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).options(selectinload(Subject.teachers)).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    update_data = request.model_dump(exclude_unset=True)
    if "teacher_ids" in update_data:
        teacher_ids = update_data.pop("teacher_ids")
        if teacher_ids is not None:
            teachers_result = await db.execute(
                select(Teacher).options(selectinload(Teacher.subjects)).where(Teacher.id.in_(teacher_ids))
            )
            teachers = list(teachers_result.scalars().all())
            for t in teachers:
                other_subjects = [s for s in t.subjects if s.id != subject_id]
                if other_subjects:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Teacher {t.id} is already assigned to subject '{other_subjects[0].name}'"
                    )
            subject.teachers = teachers
            
    for key, value in update_data.items():
        setattr(subject, key, value)
        
    await db.commit()
    await db.refresh(subject, ["teachers"])

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Subject",
        entity_id=subject.id,
        description=f"Updated subject {subject.name}")
    await db.commit()

    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    await db.delete(subject)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Subject",
        entity_id=subject_id,
        description=f"Deleted subject {subject.name}")
    await db.commit()


@router.post("/{subject_id}/assign-teacher")
async def assign_teacher_to_subject(
    subject_id: int,
    teacher_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).options(selectinload(Subject.teachers)).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    teacher_result = await db.execute(
        select(Teacher).options(selectinload(Teacher.subjects)).where(Teacher.id == teacher_id)
    )
    teacher = teacher_result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        
    other_subjects = [s for s in teacher.subjects if s.id != subject_id]
    if other_subjects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Teacher {teacher.id} is already assigned to subject '{other_subjects[0].name}'"
        )
        
    if teacher not in subject.teachers:
        subject.teachers.append(teacher)
        
    # Update any existing schedules for this subject to use the given teacher
    # Assuming this assignment updates schedules without breaking M2M logic
    await db.execute(
        Schedule.__table__.update().where(Schedule.subject_id == subject_id).values(teacher_id=teacher_id)
    )
    await db.commit()
    await db.refresh(subject, ["teachers"])

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="ASSIGN_TEACHER",
        entity_type="Subject",
        entity_id=subject.id,
        description=f"Assigned teacher ID {teacher_id} to subject {subject.name}")
    await db.commit()

    return subject