from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def write_audit_log(
    db: AsyncSession,
    *,
    user_id: int | None = None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    description: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Create an audit log entry.  Call this after any significant CRUD action."""
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
    )
    db.add(log)
    # Flush so the id is available, but don't commit – leave that to the caller.
    await db.flush()
    return log
