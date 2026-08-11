from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.database import get_db
from app.models.attendance import Attendance
from app.core.dependencies import require_role

router = APIRouter()


@router.get("/attendance-summary")
async def attendance_summary(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    # Compute total records and present count server-side to avoid client-side discrepancies
    total_result = await db.execute(select(func.count()).select_from(Attendance))
    total = int(total_result.scalar_one() or 0)
    present_result = await db.execute(select(func.count()).select_from(Attendance).where(Attendance.status == "present"))
    present = int(present_result.scalar_one() or 0)
    absent_result = await db.execute(select(func.count()).select_from(Attendance).where(Attendance.status == "absent"))
    absent = int(absent_result.scalar_one() or 0)
    rate = (present / total) * 100 if total > 0 else 0.0
    return {"total": total, "present": present, "absent": absent, "rate": rate}
