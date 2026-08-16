from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.class_model import Class
from app.models.teacher import Teacher
from app.models.student import Student
from app.schemas.class_schema import ClassCreate, ClassUpdate, ClassResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/classes", tags=["classes"])


async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    return set(result.scalars().all())


@router.get("/", response_model=List[ClassResponse])
async def list_classes(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    # Teachers and Admins can see all classes
    if current_user.get("role") in ("admin", "teacher"):
        result = await db.execute(select(Class))
    elif current_user.get("role") == "student":
        student = (await db.execute(select(Student).where(Student.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if student and student.class_id:
            result = await db.execute(select(Class).where(Class.id == student.class_id))
        else:
            return []
    else:
        result = await db.execute(select(Class))
    classes = result.scalars().all()
    return classes


@router.get("/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    # Teachers and Admins can access any class details
    if current_user.get("role") == "student":
        student = (await db.execute(select(Student).where(Student.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not student or student.class_id != class_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return class_obj


@router.post("/", response_model=ClassResponse)
async def create_class(
    request: ClassCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    class_obj = Class(**request.model_dump(exclude_unset=True))
    db.add(class_obj)
    await db.commit()
    await db.refresh(class_obj)
    return class_obj


@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: int,
    request: ClassUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(class_obj, key, value)
    await db.commit()
    await db.refresh(class_obj)
    return class_obj


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    await db.delete(class_obj)
    await db.commit()