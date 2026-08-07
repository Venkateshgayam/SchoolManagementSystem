from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("/", response_model=List[AnnouncementResponse])
async def list_announcements(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Announcement))
    announcements = result.scalars().all()
    return announcements


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement(
    announcement_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return announcement


@router.post("/", response_model=AnnouncementResponse)
async def create_announcement(
    request: AnnouncementCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    announcement = Announcement(**request.model_dump(exclude_unset=True))
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    return announcement


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    request: AnnouncementUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(announcement, key, value)
    await db.commit()
    await db.refresh(announcement)
    return announcement


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    await db.delete(announcement)
    await db.commit()