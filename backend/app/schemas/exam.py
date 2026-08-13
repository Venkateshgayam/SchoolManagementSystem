from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class ExamSubjectSlotBase(BaseModel):
    subject_id: int
    date: datetime
    start_time: datetime
    end_time: datetime

class ExamSubjectSlotCreate(ExamSubjectSlotBase):
    pass

class ExamSubjectSlotResponse(ExamSubjectSlotBase):
    id: int
    exam_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    exam_type: Optional[str] = Field(None, max_length=50)
    academic_year: Optional[str] = Field(None, max_length=20)
    total_marks: Optional[float] = None
    created_by: Optional[int] = None
    slots: Optional[List[ExamSubjectSlotCreate]] = []


class ExamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    exam_type: Optional[str] = Field(None, max_length=50)
    academic_year: Optional[str] = Field(None, max_length=20)
    total_marks: Optional[float] = None
    slots: Optional[List[ExamSubjectSlotCreate]] = None


class ExamResponse(BaseModel):
    id: int
    name: str
    exam_type: Optional[str] = None
    academic_year: Optional[str] = None
    total_marks: Optional[float] = None
    created_by: Optional[int] = None
    created_at: datetime
    slots: List[ExamSubjectSlotResponse] = []

    class Config:
        from_attributes = True