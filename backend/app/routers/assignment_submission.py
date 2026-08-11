from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
import os
import shutil
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.assignment_submission import AssignmentSubmission
from app.models.student import Student
from app.schemas.assignment_submission import AssignmentSubmissionCreate, AssignmentSubmissionResponse, SubmissionGradeUpdate
from app.core.dependencies import require_role, get_current_student

router = APIRouter(prefix="/assignment-submissions", tags=["assignment_submissions"])


@router.get("/", response_model=List[AssignmentSubmissionResponse])
async def list_assignment_submissions(
    current_user: dict = Depends(require_role("admin", "super_admin", "teacher", "management", "student")),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(
            select(AssignmentSubmission).where(AssignmentSubmission.student_id == student.id)
        )
    else:
        result = await db.execute(select(AssignmentSubmission))
    return result.scalars().all()


@router.post("/", response_model=AssignmentSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment_submission(
    assignment_id: int = Form(...),
    submission_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    student = await get_current_student(current_user=current_user, db=db)
    # Check for existing submission
    existing = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == student.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted this assignment.",
        )
        
    attachment_url = None
    if file:
        allowed_extensions = {".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {ext}")
            
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
            
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join("/app/uploads/submissions/assignments", filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment_url = f"/uploads/submissions/assignments/{filename}"

    submission = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=student.id,
        submission_text=submission_text,
        attachment_url=attachment_url
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.put("/{submission_id}/grade", response_model=AssignmentSubmissionResponse)
async def grade_assignment_submission(
    submission_id: int,
    request: SubmissionGradeUpdate,
    current_user: dict = Depends(require_role("teacher", "admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        
    submission.grade = request.grade
    await db.commit()
    await db.refresh(submission)
    return submission
