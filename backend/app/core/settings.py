from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.system_setting import SystemSetting
import json

_SETTINGS_CACHE = {}

async def get_setting(db: AsyncSession, key: str, default=None):
    if key in _SETTINGS_CACHE:
        return _SETTINGS_CACHE[key]
    
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    
    if setting:
        value = setting.value
        
        # Auto-parse based on type
        if setting.type == "json":
            try:
                value = json.loads(value)
            except:
                pass
        elif setting.type == "number" or setting.type == "percentage":
            try:
                if "." in value:
                    value = float(value)
                else:
                    value = int(value)
            except:
                pass
                
        _SETTINGS_CACHE[key] = value
        return value
        
    return default

def invalidate_settings_cache(key: str = None):
    if key and key in _SETTINGS_CACHE:
        del _SETTINGS_CACHE[key]
    else:
        _SETTINGS_CACHE.clear()
