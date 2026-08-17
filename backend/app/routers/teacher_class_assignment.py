from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.teacher_class_assignment import TeacherClassAssignment
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.subject import Subject
from app.schemas.teacher_class_assignment import (
    TeacherClassAssignmentCreate,
    TeacherClassAssignmentResponse,
)
from app.core.dependencies import require_role
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/teacher-class-assignments", tags=["teacher-class-assignments"])


def _to_response(assignment: TeacherClassAssignment) -> TeacherClassAssignmentResponse:
    teacher_name = None
    if assignment.teacher and assignment.teacher.user:
        teacher_name = assignment.teacher.user.full_name or f"{assignment.teacher.user.first_name or ''} {assignment.teacher.user.last_name or ''}".strip()
    
    class_name = assignment.class_model.name if assignment.class_model else None
    class_section = assignment.class_model.section if assignment.class_model else None
    subject_name = assignment.subject.name if assignment.subject else None

    return TeacherClassAssignmentResponse(
        id=assignment.id,
        teacher_id=assignment.teacher_id,
        class_id=assignment.class_id,
        subject_id=assignment.subject_id,
        teacher_name=teacher_name,
        class_name=class_name,
        class_section=class_section,
        subject_name=subject_name,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


@router.get("/", response_model=List[TeacherClassAssignmentResponse])
async def list_assignments(
    teacher_id: Optional[int] = None,
    class_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    query = (
        select(TeacherClassAssignment)
        .options(
            selectinload(TeacherClassAssignment.teacher).selectinload(Teacher.user),
            selectinload(TeacherClassAssignment.class_model),
            selectinload(TeacherClassAssignment.subject),
        )
    )

    role = current_user.get("role")
    if role == "teacher" and not teacher_id:
        teacher = (
            await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
        ).scalar_one_or_none()
        if teacher:
            query = query.where(TeacherClassAssignment.teacher_id == teacher.id)
        else:
            return []
    elif teacher_id:
        query = query.where(TeacherClassAssignment.teacher_id == teacher_id)

    if class_id:
        query = query.where(TeacherClassAssignment.class_id == class_id)
    if subject_id:
        query = query.where(TeacherClassAssignment.subject_id == subject_id)

    result = await db.execute(query)
    assignments = result.scalars().all()
    return [_to_response(a) for a in assignments]


@router.get("/{assignment_id}", response_model=TeacherClassAssignmentResponse)
async def get_assignment(
    assignment_id: int,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TeacherClassAssignment)
        .options(
            selectinload(TeacherClassAssignment.teacher).selectinload(Teacher.user),
            selectinload(TeacherClassAssignment.class_model),
            selectinload(TeacherClassAssignment.subject),
        )
        .where(TeacherClassAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return _to_response(assignment)


@router.post("/", response_model=TeacherClassAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    request: TeacherClassAssignmentCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    # Validate Teacher exists
    teacher = (
        await db.execute(select(Teacher).where(Teacher.id == request.teacher_id))
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    # Validate Class exists
    class_obj = (
        await db.execute(select(Class).where(Class.id == request.class_id))
    ).scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    # Validate Subject exists if provided
    if request.subject_id:
        subject = (
            await db.execute(select(Subject).where(Subject.id == request.subject_id))
        ).scalar_one_or_none()
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    # Check for existing duplicate
    existing = (
        await db.execute(
            select(TeacherClassAssignment).where(
                and_(
                    TeacherClassAssignment.teacher_id == request.teacher_id,
                    TeacherClassAssignment.class_id == request.class_id,
                    TeacherClassAssignment.subject_id == request.subject_id,
                )
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This teacher-class-subject assignment already exists")

    assignment = TeacherClassAssignment(
        teacher_id=request.teacher_id,
        class_id=request.class_id,
        subject_id=request.subject_id,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="TeacherClassAssignment",
        entity_id=assignment.id,
        description=f"Assigned teacher #{request.teacher_id} to class #{request.class_id} (subject #{request.subject_id})",
    )
    await db.commit()

    # Re-fetch with relations loaded
    result = await db.execute(
        select(TeacherClassAssignment)
        .options(
            selectinload(TeacherClassAssignment.teacher).selectinload(Teacher.user),
            selectinload(TeacherClassAssignment.class_model),
            selectinload(TeacherClassAssignment.subject),
        )
        .where(TeacherClassAssignment.id == assignment.id)
    )
    return _to_response(result.scalar_one())


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TeacherClassAssignment).where(TeacherClassAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="TeacherClassAssignment",
        entity_id=assignment_id,
        description=f"Removed teacher class assignment #{assignment_id}",
    )
    await db.commit()
