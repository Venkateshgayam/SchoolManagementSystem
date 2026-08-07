from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate, NotificationResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(Notification.user_id == int(current_user["sub"]))
    )
    notifications = result.scalars().all()
    return notifications


@router.get("/all", response_model=List[NotificationResponse])
async def list_all_notifications(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Notification))
    notifications = result.scalars().all()
    return notifications


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if int(current_user["sub"]) != notification.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return notification


@router.post("/", response_model=NotificationResponse)
async def create_notification(
    request: NotificationCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    notification = Notification(**request.model_dump(exclude_unset=True))
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if int(current_user["sub"]) != notification.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post("/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == int(current_user["sub"]),
            Notification.is_read.is_(False),
        )
    )
    notifications = result.scalars().all()
    for notification in notifications:
        notification.is_read = True
    await db.commit()
    return {"message": "All notifications marked as read", "updated": len(notifications)}


@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    request: NotificationUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(notification, key, value)
    await db.commit()
    await db.refresh(notification)
    return notification


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    await db.delete(notification)
    await db.commit()
