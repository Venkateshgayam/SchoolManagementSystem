from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.school import School
from app.schemas.school import SchoolCreate, SchoolUpdate, SchoolResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/schools", tags=["schools"])


@router.get("/", response_model=List[SchoolResponse])
async def list_schools(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.is_active == True))
    schools = result.scalars().all()
    return schools


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(
    school_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    return school


@router.post("/", response_model=SchoolResponse)
async def create_school(
    request: SchoolCreate,
    current_user: dict = Depends(require_role("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    school = School(**request.model_dump(exclude_unset=True))
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return school


@router.put("/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: int,
    request: SchoolUpdate,
    current_user: dict = Depends(require_role("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(school, key, value)
    await db.commit()
    await db.refresh(school)
    return school


@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_school(
    school_id: int,
    current_user: dict = Depends(require_role("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    await db.delete(school)
    await db.commit()