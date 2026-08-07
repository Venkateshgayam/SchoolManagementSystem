from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional


class FeeCreate(BaseModel):
    student_id: int
    amount: float = Field(..., gt=0)
    due_date: Optional[date] = None
    academic_year: Optional[str] = Field(None, max_length=20)


class FeeUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)
    academic_year: Optional[str] = Field(None, max_length=20)


class FeeResponse(BaseModel):
    id: int
    student_id: int
    amount: float
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: str
    academic_year: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True