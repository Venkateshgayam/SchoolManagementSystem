from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional


class FeeCreate(BaseModel):
    student_id: int
    waiver_percentage: Optional[float] = Field(0.0, ge=0.0, le=100.0)
    due_date: Optional[date] = None
    academic_year: Optional[str] = Field(None, max_length=20)


class FeeUpdate(BaseModel):
    waiver_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    payment_amount: Optional[float] = Field(None, ge=0.0)
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)
    academic_year: Optional[str] = Field(None, max_length=20)


class FeeResponse(BaseModel):
    id: int
    student_id: int
    student_user_id: Optional[int] = None
    waiver_percentage: float
    total_fee: float = 0.0
    amount_paid: float
    amount_due: Optional[float] = None # Calculated field
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: str
    academic_year: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True