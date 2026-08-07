from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class CurriculumCreate(BaseModel):
    subject_id: int
    class_id: int
    description: Optional[str] = None
    teaching_hours: Optional[int] = Field(None, ge=0)
    created_by: Optional[int] = None


class CurriculumUpdate(BaseModel):
    subject_id: Optional[int] = None
    class_id: Optional[int] = None
    description: Optional[str] = None
    teaching_hours: Optional[int] = Field(None, ge=0)


class CurriculumResponse(BaseModel):
    id: int
    subject_id: int
    class_id: int
    description: Optional[str] = None
    teaching_hours: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True