from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("/", response_model=List[SubjectResponse])
async def list_subjects(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Subject))
    subjects = result.scalars().all()
    return subjects


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


@router.post("/", response_model=SubjectResponse)
async def create_subject(
    request: SubjectCreate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    subject = Subject(**request.model_dump(exclude_unset=True))
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    request: SubjectUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subject, key, value)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    await db.delete(subject)
    await db.commit()