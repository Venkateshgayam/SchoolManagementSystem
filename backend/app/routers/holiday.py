import calendar
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from app.database.database import get_db
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayCreate, HolidayResponse, HolidayCalendarEntry
from app.core.dependencies import require_role, get_current_active_user
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/holidays", tags=["holidays"])

VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@router.get("/", response_model=List[HolidayResponse])
async def list_holidays(
    class_id: Optional[int] = Query(None, alias="classId"),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List holidays.
    If class_id/classId is provided, returns school-wide (class_id is NULL) + class-specific holidays.
    If class_id is omitted, returns all holidays.
    """
    query = select(Holiday)
    if class_id is not None:
        query = query.where(or_(Holiday.class_id.is_(None), Holiday.class_id == class_id))
    
    query = query.order_by(Holiday.id.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/calendar", response_model=List[HolidayCalendarEntry])
async def get_holiday_calendar(
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=1900, le=2100, description="Year (e.g. 2026)"),
    class_id: Optional[int] = Query(None, alias="classId"),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Projects recurring weekday holidays onto real calendar dates for the specified month/year,
    merges in specific-date holidays for that month, and returns sorted entries.
    """
    # 1. Fetch relevant holidays (school-wide + class-specific if class_id provided)
    query = select(Holiday)
    if class_id is not None:
        query = query.where(or_(Holiday.class_id.is_(None), Holiday.class_id == class_id))
    
    result = await db.execute(query)
    all_holidays = result.scalars().all()

    # Separate recurring vs specific
    recurring_by_day = {}
    for h in all_holidays:
        if h.type == "recurring" and h.day:
            day_cap = h.day.capitalize()
            # If both school-wide and class-specific exist, class-specific can override or take precedence
            if day_cap not in recurring_by_day or h.class_id is not None:
                recurring_by_day[day_cap] = h

    specific_by_date = {}
    for h in all_holidays:
        if h.type == "specific" and h.date:
            d_str = h.date.isoformat()
            if d_str not in specific_by_date or h.class_id is not None:
                specific_by_date[d_str] = h

    # 2. Iterate through all days of the month
    _, last_day = calendar.monthrange(year, month)
    entries: List[HolidayCalendarEntry] = []

    for d in range(1, last_day + 1):
        curr_date = date(year, month, d)
        date_str = curr_date.isoformat()
        day_name = curr_date.strftime("%A")

        if date_str in specific_by_date:
            h = specific_by_date[date_str]
            entries.append(
                HolidayCalendarEntry(
                    date=date_str,
                    day=day_name,
                    reason=h.reason or "Holiday",
                    type="specific",
                    class_id=h.class_id,
                )
            )
        elif day_name in recurring_by_day:
            h = recurring_by_day[day_name]
            entries.append(
                HolidayCalendarEntry(
                    date=date_str,
                    day=day_name,
                    reason=h.reason or f"{day_name} Holiday",
                    type="recurring",
                    class_id=h.class_id,
                )
            )

    entries.sort(key=lambda x: x.date)
    return entries


@router.post("/", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    request: HolidayCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new holiday (recurring or specific). Admin-only.
    Enforces validation and prevents duplicate entries.
    """
    data = request.model_dump(exclude_unset=True)
    h_type = data.get("type")
    h_day = data.get("day")
    h_date = data.get("date")
    h_class_id = data.get("class_id")

    if h_type == "recurring":
        if not h_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Day is required for recurring holiday",
            )
        day_formatted = h_day.strip().capitalize()
        if day_formatted not in VALID_DAYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid day '{h_day}'. Must be one of {', '.join(VALID_DAYS)}",
            )
        data["day"] = day_formatted
        data["date"] = None

        # Check duplicate
        dup_query = select(Holiday).where(
            Holiday.type == "recurring",
            Holiday.day == day_formatted,
            Holiday.class_id.is_(None) if h_class_id is None else Holiday.class_id == h_class_id,
        )
        existing = (await db.execute(dup_query)).scalar_one_or_none()
        if existing:
            scope = f"for class #{h_class_id}" if h_class_id else "school-wide"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A recurring holiday for {day_formatted} already exists ({scope}).",
            )

    elif h_type == "specific":
        if not h_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date is required for specific holiday",
            )
        data["day"] = None

        # Check duplicate
        dup_query = select(Holiday).where(
            Holiday.type == "specific",
            Holiday.date == h_date,
            Holiday.class_id.is_(None) if h_class_id is None else Holiday.class_id == h_class_id,
        )
        existing = (await db.execute(dup_query)).scalar_one_or_none()
        if existing:
            scope = f"for class #{h_class_id}" if h_class_id else "school-wide"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A holiday for date {h_date} already exists ({scope}).",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Holiday type must be 'recurring' or 'specific'",
        )

    # created_by is set to the current admin ID (nullable for future external API sync compatibility)
    data["created_by"] = int(current_user["sub"]) if current_user.get("sub") else None

    holiday = Holiday(**data)
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user.get("sub") else None,
        action="CREATE",
        entity_type="Holiday",
        entity_id=holiday.id,
        description=f"Created {holiday.type} holiday id={holiday.id} (reason: {holiday.reason})",
    )
    await db.commit()

    return holiday


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a holiday. Admin-only.
    """
    result = await db.execute(select(Holiday).where(Holiday.id == holiday_id))
    holiday = result.scalar_one_or_none()
    if not holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")

    await db.delete(holiday)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user.get("sub") else None,
        action="DELETE",
        entity_type="Holiday",
        entity_id=holiday_id,
        description=f"Deleted holiday id={holiday_id}",
    )
    await db.commit()
