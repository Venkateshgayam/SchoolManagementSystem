from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional


class LeaveRequestCreate(BaseModel):
    student_id: int
    from_date: date
    to_date: date
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[str] = Field(None, max_length=20)
    approved_by: Optional[int] = None
    remarks: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: int
    student_id: int
    from_date: date
    to_date: date
    reason: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True