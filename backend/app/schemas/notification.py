from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class NotificationCreate(BaseModel):
    user_id: int
    title: str = Field(..., min_length=1, max_length=255)
    message: Optional[str] = None
    type: Optional[str] = Field(None, max_length=50)


class NotificationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    message: Optional[str] = None
    type: Optional[str] = Field(None, max_length=50)
    is_read: Optional[bool] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: Optional[str] = None
    type: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True