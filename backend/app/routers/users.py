from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.user import UserAdminUpdate, UserProfileUpdate
from app.core.dependencies import require_role, get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role.value,
        full_name=user.full_name,
        phone_number=user.phone_number,
        profile_picture_url=user.profile_picture_url,
        is_active=user.is_active,
        created_at=user.created_at)


@router.get("/", response_model=List[UserResponse])
async def list_users(
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()
    return [_to_response(user) for user in users]


@router.put("/profile", response_model=UserResponse)
async def update_own_profile(
    request: UserProfileUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == int(current_user["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return _to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: UserAdminUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return _to_response(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    if int(current_user["sub"]) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await db.delete(user)
    await db.commit()