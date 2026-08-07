from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.academic_calendar import AcademicCalendar
from app.schemas.academic_calendar import AcademicCalendarCreate, AcademicCalendarUpdate, AcademicCalendarResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/academic-calendar", tags=["academic_calendar"])


@router.get("/", response_model=List[AcademicCalendarResponse])
async def list_calendar_events(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AcademicCalendar))
    events = result.scalars().all()
    return events


@router.get("/{event_id}", response_model=AcademicCalendarResponse)
async def get_calendar_event(
    event_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AcademicCalendar).where(AcademicCalendar.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")
    return event


@router.post("/", response_model=AcademicCalendarResponse)
async def create_calendar_event(
    request: AcademicCalendarCreate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    event = AcademicCalendar(**request.model_dump(exclude_unset=True))
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.put("/{event_id}", response_model=AcademicCalendarResponse)
async def update_calendar_event(
    event_id: int,
    request: AcademicCalendarUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AcademicCalendar).where(AcademicCalendar.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_event(
    event_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AcademicCalendar).where(AcademicCalendar.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")
    await db.delete(event)
    await db.commit()