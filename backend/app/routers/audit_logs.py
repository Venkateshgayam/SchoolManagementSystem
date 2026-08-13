from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.audit_log import AuditLog
from sqlalchemy.orm import selectinload
from app.schemas.audit_log import AuditLogResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/audit-logs", tags=["audit_logs"])


def _to_response(log: AuditLog) -> AuditLogResponse:
    return AuditLogResponse(
        id=log.id,
        user_id=log.user_id,
        user_name=log.user.full_name if log.user else None,
        user_role=log.user.role.value if log.user else None,
        action=log.action,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        description=log.description,
        ip_address=log.ip_address,
        created_at=log.created_at)


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AuditLog).options(selectinload(AuditLog.user)).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(500)
    )
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