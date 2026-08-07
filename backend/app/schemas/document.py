from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    file_url: Optional[str] = Field(None, max_length=500)
    document_type: Optional[str] = Field(None, max_length=50)
    student_id: Optional[int] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    file_url: Optional[str] = Field(None, max_length=500)
    document_type: Optional[str] = Field(None, max_length=50)
    student_id: Optional[int] = None


class DocumentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    document_type: Optional[str] = None
    uploaded_by: Optional[int] = None
    student_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True