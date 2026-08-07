from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    target_role: Optional[str] = Field(None, max_length=50)
    expires_at: Optional[datetime] = None
    is_pinned: bool = False


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    target_role: Optional[str] = Field(None, max_length=50)
    expires_at: Optional[datetime] = None
    is_pinned: Optional[bool] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    created_by: Optional[int] = None
    target_role: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_pinned: bool

    class Config:
        from_attributes = True