from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.audit_log import AuditLog
from sqlalchemy.orm import selectinload
from app.schemas.audit_log import AuditLogResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/audit-logs", tags=["audit_logs"])


def _to_response(log: AuditLog) -> AuditLogResponse:
    user_role_str = None
    if log.user:
        user_role_str = log.user.role.value if hasattr(log.user.role, 'value') else str(log.user.role)
    return AuditLogResponse(
        id=log.id,
        user_id=log.user_id,
        user_name=log.user.full_name if log.user else None,
        user_role=user_role_str,
        action=log.action or "UNKNOWN",
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        description=log.description,
        ip_address=log.ip_address,
        created_at=log.created_at)


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD or ISO)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD or ISO)"),
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    query = select(AuditLog).options(selectinload(AuditLog.user))

    if start_date:
        try:
            sd = datetime.fromisoformat(start_date)
            query = query.where(AuditLog.created_at >= sd)
        except Exception:
            pass

    if end_date:
        try:
            ed = datetime.fromisoformat(end_date)
            if len(end_date) == 10:
                ed = ed.replace(hour=23, minute=59, second=59)
            query = query.where(AuditLog.created_at <= ed)
        except Exception:
            pass

    query = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(1000)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [_to_response(log) for log in logs]


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).options(selectinload(AuditLog.user)).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found")
    return _to_response(log)