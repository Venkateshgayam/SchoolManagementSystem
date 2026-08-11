from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class AssignmentSubmissionCreate(BaseModel):
    assignment_id: int
    submission_text: Optional[str] = None


class SubmissionGradeUpdate(BaseModel):
    grade: float


class AssignmentSubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    submission_text: Optional[str] = None
    attachment_url: Optional[str] = None
    submitted_at: datetime
    grade: Optional[float] = None

    class Config:
        from_attributes = True
