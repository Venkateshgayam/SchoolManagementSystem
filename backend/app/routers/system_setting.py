from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.system_setting import SystemSetting
from pydantic import BaseModel
from app.core.dependencies import require_role

router = APIRouter(prefix="/settings", tags=["settings"])

class SystemSettingSchema(BaseModel):
    key: str
    value: str
    description: str | None = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[SystemSettingSchema])
async def list_settings(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()
    return settings

@router.put("/{key}", response_model=SystemSettingSchema)
async def update_setting(
    key: str,
    request: SystemSettingSchema,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    
    if setting:
        setting.value = request.value
        setting.description = request.description
    else:
        setting = SystemSetting(key=key, value=request.value, description=request.description)
        db.add(setting)
        
    await db.commit()
    await db.refresh(setting)
    return setting
