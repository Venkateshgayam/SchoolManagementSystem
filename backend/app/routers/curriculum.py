from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.curriculum import Curriculum
from app.schemas.curriculum import CurriculumCreate, CurriculumUpdate, CurriculumResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


@router.get("/", response_model=List[CurriculumResponse])
async def list_curriculum(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Curriculum))
    curricula = result.scalars().all()
    return curricula


@router.get("/{curriculum_id}", response_model=CurriculumResponse)
async def get_curriculum(
    curriculum_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curriculum not found")
    return curriculum


@router.post("/", response_model=CurriculumResponse)
async def create_curriculum(
    request: CurriculumCreate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    curriculum = Curriculum(**request.model_dump(exclude_unset=True))
    db.add(curriculum)
    await db.commit()
    await db.refresh(curriculum)
    return curriculum


@router.put("/{curriculum_id}", response_model=CurriculumResponse)
async def update_curriculum(
    curriculum_id: int,
    request: CurriculumUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curriculum not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(curriculum, key, value)
    await db.commit()
    await db.refresh(curriculum)
    return curriculum


@router.delete("/{curriculum_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_curriculum(
    curriculum_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curriculum not found")
    await db.delete(curriculum)
    await db.commit()