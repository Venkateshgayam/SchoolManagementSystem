from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ExamSubmissionCreate(BaseModel):
    exam_subject_slot_id: int
    submission_text: Optional[str] = None


class SubmissionGradeUpdate(BaseModel):
    grade: float


class ExamSubmissionResponse(BaseModel):
    id: int
    exam_subject_slot_id: int
    student_id: int
    submission_text: Optional[str] = None
    attachment_url: Optional[str] = None
    submitted_at: datetime
    grade: Optional[float] = None

    class Config:
        from_attributes = True
