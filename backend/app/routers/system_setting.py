from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.system_setting import SystemSetting
from pydantic import BaseModel
from app.core.dependencies import require_role

from app.core.settings import invalidate_settings_cache

router = APIRouter(prefix="/settings", tags=["settings"])

class SystemSettingSchema(BaseModel):
    key: str
    value: str
    type: str = "string"
    description: str | None = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[SystemSettingSchema])
async def list_settings(
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()
    return settings

@router.put("/{key}", response_model=SystemSettingSchema)
async def update_setting(
    key: str,
    request: SystemSettingSchema,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    
    if setting:
        setting.value = request.value
        if request.type:
            setting.type = request.type
        setting.description = request.description
    else:
        setting = SystemSetting(key=key, value=request.value, type=request.type, description=request.description)
        db.add(setting)
        
    await db.commit()
    await db.refresh(setting)
    
    invalidate_settings_cache(key)
    
    return setting
