from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.curriculum import Curriculum
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.class_model import Class
from app.schemas.curriculum import CurriculumCreate, CurriculumUpdate, CurriculumResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    return set(result.scalars().all())

@router.get("/", response_model=List[CurriculumResponse])
async def list_curriculum(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    
    role = current_user.get("role")
    if role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if not class_ids:
            return []
        result = await db.execute(select(Curriculum).where(Curriculum.class_id.in_(class_ids)))
    elif role == "student":
        student = (await db.execute(select(Student).where(Student.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if student and student.class_id:
            result = await db.execute(select(Curriculum).where(Curriculum.class_id == student.class_id))
        else:
            return []
    else:
        result = await db.execute(select(Curriculum))
        
    curricula = result.scalars().all()
    return curricula


@router.get("/{curriculum_id}", response_model=CurriculumResponse)
async def get_curriculum(
    curriculum_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curriculum not found")
        
    role = current_user.get("role")
    if role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if curriculum.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif role == "student":
        student = (await db.execute(select(Student).where(Student.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not student or curriculum.class_id != student.class_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
    return curriculum


@router.post("/", response_model=CurriculumResponse)
async def create_curriculum(
    request: CurriculumCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    curriculum = Curriculum(**request.model_dump(exclude_unset=True))
    db.add(curriculum)
    await db.commit()
    await db.refresh(curriculum)
    return curriculum


@router.put("/{curriculum_id}", response_model=CurriculumResponse)
async def update_curriculum(
    curriculum_id: int,
    request: CurriculumUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
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
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curriculum not found")
    await db.delete(curriculum)
    await db.commit()