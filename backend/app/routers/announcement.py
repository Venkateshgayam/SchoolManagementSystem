from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database.database import get_db
from app.models.announcement import Announcement, AnnouncementDismissal
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from app.core.dependencies import require_role
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/announcements", tags=["announcements"])


def _visible_target_roles(user_role: str) -> Optional[List[str]]:
    """Return the target_role values a given role is allowed to see.

    Teachers see announcements for "teachers" and "all" (plus legacy rows
    where no target was set). Students see "students" and "all" (plus legacy
    rows). Admins manage everything and see all announcements.
    Returns None when the role should see all announcements.
    """
    if user_role == "teacher":
        return ["all", "teachers"]
    if user_role == "student":
        return ["all", "students"]
    return None  # admin sees everything


def _apply_role_filter(query, user_role: str):
    """Constrain a query to announcements visible to the given role."""
    visible_roles = _visible_target_roles(user_role)
    if visible_roles is None:
        return query
    return query.where(
        or_(
            Announcement.target_role.is_(None),
            Announcement.target_role.in_(visible_roles),
        )
    )


@router.get("/", response_model=List[AnnouncementResponse])
async def list_announcements(
    include_dismissed: bool = False,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    query = select(Announcement)
    user_id = int(current_user["sub"]) if current_user.get("sub") else None

    if not include_dismissed and user_id is not None:
        dismissed_subquery = select(AnnouncementDismissal.announcement_id).where(
            AnnouncementDismissal.user_id == user_id
        )
        query = query.where(Announcement.id.not_in(dismissed_subquery))

    query = _apply_role_filter(query, current_user.get("role"))
    result = await db.execute(query)
    announcements = result.scalars().all()
    return announcements


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement(
    announcement_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    query = _apply_role_filter(
        select(Announcement).where(Announcement.id == announcement_id),
        current_user.get("role"),
    )
    result = await db.execute(query)
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return announcement


@router.post("/", response_model=AnnouncementResponse)
async def create_announcement(
    request: AnnouncementCreate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    announcement = Announcement(**request.model_dump(exclude_unset=True))
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Announcement",
        entity_id=announcement.id,
        description=f"Created announcement {announcement.title}")
    await db.commit()

    return announcement


@router.post("/{announcement_id}/dismiss")
async def dismiss_announcement(
    announcement_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    user_id = int(current_user["sub"])
    existing = await db.execute(
        select(AnnouncementDismissal).where(
            AnnouncementDismissal.announcement_id == announcement_id,
            AnnouncementDismissal.user_id == user_id
        )
    )
    if not existing.scalar_one_or_none():
        dismissal = AnnouncementDismissal(announcement_id=announcement_id, user_id=user_id)
        db.add(dismissal)
        await db.commit()
    return {"message": "Announcement dismissed", "announcement_id": announcement_id}


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    request: AnnouncementUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(announcement, key, value)
    await db.commit()
    await db.refresh(announcement)

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Announcement",
        entity_id=announcement.id,
        description=f"Updated announcement {announcement.title}")
    await db.commit()

    return announcement


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: int,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    user_id = int(current_user["sub"])
    user_role = current_user.get("role")
    if user_role != "admin" and announcement.created_by != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins or the creator can delete this announcement")

    announcement_title = announcement.title
    await db.delete(announcement)
    await db.commit()

    await write_audit_log(
        db,
        user_id=user_id,
        action="DELETE",
        entity_type="Announcement",
        entity_id=announcement_id,
        description=f"Deleted announcement '{announcement_title}' (ID: {announcement_id})")
    await db.commit()