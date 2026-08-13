from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.user import User, RoleEnum
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.dependencies import require_role
from app.schemas.auth import (
    LoginRequest,
    UserResponse,
    TokenRefreshRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserCreate,
)

router = APIRouter()


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role.value,
        full_name=user.full_name,
        phone_number=user.phone_number,
        profile_picture_url=user.profile_picture_url,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def _set_auth_cookies(response: JSONResponse, access_token: str, refresh_token: str, remember_me: bool = False) -> None:
    access_expire = timedelta(minutes=30)
    refresh_expire = timedelta(days=30) if remember_me else timedelta(days=7)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=int(access_expire.total_seconds()),
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=int(refresh_expire.total_seconds()),
        path="/",
    )


def _clear_auth_cookies(response: JSONResponse) -> None:
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value, "is_active": user.is_active})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    response = JSONResponse(content={
        "user": _user_to_response(user).model_dump(mode="json"),
        "message": "Login successful",
    })
    _set_auth_cookies(response, access_token, refresh_token, request.remember_me)
    return response


@router.post("/logout")
async def logout(request: Request):
    response = JSONResponse(content={"message": "Logged out successfully"})
    _clear_auth_cookies(response)
    return response


@router.post("/refresh-token")
async def refresh_token(request: Request, db: AsyncSession = Depends(get_db)):
    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    payload = decode_token(refresh_token_value)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value, "is_active": user.is_active})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    response = JSONResponse(content={
        "user": _user_to_response(user).model_dump(mode="json"),
        "message": "Token refreshed",
    })
    _set_auth_cookies(response, access_token, new_refresh_token)
    return response


@router.get("/me", response_model=UserResponse)
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _user_to_response(user)


@router.put("/change-password")
async def change_password(
    request: Request,
    change_request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not verify_password(change_request.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.password_hash = hash_password(change_request.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    if user:
        pass
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    return {"message": "Password has been reset successfully"}


@router.post("/register", response_model=UserResponse)
async def register(request: UserCreate, current_user: dict = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):

    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    user = User(
        email=request.email,
        username=request.username,
        password_hash=hash_password(request.password),
        role=request.role,
        full_name=request.full_name,
        phone_number=request.phone_number,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)