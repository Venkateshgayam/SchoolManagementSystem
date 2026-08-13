from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.core.security import decode_token


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return payload


async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user


def require_role(*allowed_roles: str):
    async def role_checker(
        current_user: dict = Depends(get_current_active_user),
    ) -> dict:
        user_role = current_user.get("role")
        
        if user_role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker


async def get_current_student(
    current_user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.student import Student
    result = await db.execute(select(Student).where(Student.user_id == int(current_user["sub"])))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return student


async def get_current_teacher(
    current_user: dict = Depends(require_role("teacher")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.teacher import Teacher
    result = await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")
    return teacher