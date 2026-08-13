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
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.schemas.assignment_submission import AssignmentSubmissionCreate, AssignmentSubmissionResponse, SubmissionGradeUpdate
from app.core.dependencies import require_role, get_current_student

router = APIRouter(prefix="/assignment-submissions", tags=["assignment_submissions"])


async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    return set(result.scalars().all())


@router.get("/", response_model=List[AssignmentSubmissionResponse])
async def list_assignment_submissions(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(
            select(AssignmentSubmission).where(AssignmentSubmission.student_id == student.id)
        )
    elif role == "teacher":
        from app.models.assignment import Assignment
        class_ids = await _teacher_class_ids(db, current_user)
        if not class_ids:
            return []
        result = await db.execute(
            select(AssignmentSubmission).join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
            .where(Assignment.class_id.in_(class_ids))
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
    db: AsyncSession = Depends(get_db)):
    student = await get_current_student(current_user=current_user, db=db)
    # Check for existing submission
    existing = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == student.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted this assignment.")
        
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
    current_user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        
    from app.models.assignment import Assignment
    assignment = (
        await db.execute(select(Assignment).where(Assignment.id == submission.assignment_id))
    ).scalar_one_or_none()

    if current_user.get("role") == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if not assignment or assignment.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot grade submission for a class you do not teach")
            
    from app.core.settings import get_setting
    max_marks = await get_setting(db, "default_assignment_marks_scale", 30.0)
    
    if request.grade < 0 or request.grade > max_marks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Grade must be between 0 and {max_marks}")
        
    submission.grade = request.grade
    await db.commit()
    await db.refresh(submission)
    return submission
