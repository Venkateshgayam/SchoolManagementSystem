from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
import os
import shutil
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.exam_submission import ExamSubmission
from app.models.student import Student
from app.models.grade import Grade
from app.models.exam import Exam, ExamSubjectSlot
from app.schemas.exam_submission import ExamSubmissionCreate, ExamSubmissionResponse, SubmissionGradeUpdate
from app.core.dependencies import require_role, get_current_student
from app.routers.grade import calculate_letter_grade
from app.core.settings import get_setting

router = APIRouter(prefix="/exam-submissions", tags=["exam_submissions"])


async def _teacher_subject_ids(db: AsyncSession, current_user: dict) -> set:
    from app.models.teacher import Teacher
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    from app.routers.exam import _teacher_subject_ids_all_sources
    return await _teacher_subject_ids_all_sources(db, teacher.id)

@router.get("/", response_model=List[ExamSubmissionResponse])
async def list_exam_submissions(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(
            select(ExamSubmission).where(ExamSubmission.student_id == student.id)
        )
    elif role == "teacher":
        from app.models.teacher import Teacher
        teacher = (
            await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
        ).scalar_one_or_none()
        subject_ids = await _teacher_subject_ids(db, current_user)
        
        from sqlalchemy import or_
        filters = []
        if subject_ids:
            filters.append(ExamSubjectSlot.subject_id.in_(subject_ids))
        if teacher:
            filters.append(ExamSubjectSlot.teacher_id == teacher.id)
        filters.append(Exam.created_by == int(current_user["sub"]))

        result = await db.execute(
            select(ExamSubmission)
            .join(ExamSubjectSlot, ExamSubmission.exam_subject_slot_id == ExamSubjectSlot.id)
            .join(Exam, ExamSubjectSlot.exam_id == Exam.id)
            .where(or_(*filters))
        )
    else:
        result = await db.execute(select(ExamSubmission))
    return result.scalars().all()


@router.post("/", response_model=ExamSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_submission(
    exam_subject_slot_id: int = Form(...),
    submission_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db)):
    student = await get_current_student(current_user=current_user, db=db)
    # Check if slot exists and deadline hasn't passed
    slot = await db.execute(select(ExamSubjectSlot).where(ExamSubjectSlot.id == exam_subject_slot_id))
    slot = slot.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam slot not found.")
        
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    if now < slot.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This exam has not started yet.")
        
    if now > slot.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The deadline for this exam has passed.")

    # Check for existing submission
    existing = await db.execute(
        select(ExamSubmission).where(
            ExamSubmission.exam_subject_slot_id == exam_subject_slot_id,
            ExamSubmission.student_id == student.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted for this exam.")
        
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
        filepath = os.path.join("/app/uploads/submissions/exams", filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment_url = f"/uploads/submissions/exams/{filename}"

    submission = ExamSubmission(
        exam_subject_slot_id=exam_subject_slot_id,
        student_id=student.id,
        submission_text=submission_text,
        attachment_url=attachment_url
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.put("/{submission_id}/grade", response_model=ExamSubmissionResponse)
async def grade_exam_submission(
    submission_id: int,
    request: SubmissionGradeUpdate,
    current_user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExamSubmission).where(ExamSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    slot = (await db.execute(select(ExamSubjectSlot).where(ExamSubjectSlot.id == submission.exam_subject_slot_id))).scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=400, detail="Invalid exam slot")
        
    exam = (await db.execute(select(Exam).where(Exam.id == slot.exam_id))).scalar_one_or_none()

    if current_user.get("role") == "teacher":
        from app.models.teacher import Teacher
        teacher = (
            await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
        ).scalar_one_or_none()
        subject_ids = await _teacher_subject_ids(db, current_user)
        is_subject_teacher = slot.subject_id in subject_ids
        is_slot_teacher = (slot.teacher_id == teacher.id) if teacher else False
        is_exam_creator = (exam.created_by == int(current_user["sub"])) if exam else False
        if not (is_subject_teacher or is_slot_teacher or is_exam_creator):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot grade submission for an exam/subject you do not teach")
    # Use the exam's stored total_marks if available; fall back to the configurable default_exam_marks_scale setting
    max_marks = exam.total_marks if exam and exam.total_marks else float(await get_setting(db, "default_exam_marks_scale", 100.0))
    
    if request.grade < 0 or request.grade > max_marks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Grade must be between 0 and {max_marks}")
        
    submission.grade = request.grade
    
    # Also sync to Grades table
    existing_grade = (await db.execute(
        select(Grade).where(
            Grade.student_id == submission.student_id,
            Grade.subject_id == slot.subject_id,
            Grade.exam_id == slot.exam_id
        )
    )).scalar_one_or_none()
    
    percentage = (submission.grade / max_marks) * 100
    letter_grade = await calculate_letter_grade(percentage, db)

    if existing_grade:
        existing_grade.marks_obtained = submission.grade
        existing_grade.total_marks = max_marks
        existing_grade.percentage = percentage
        existing_grade.letter_grade = letter_grade
    else:
        new_grade = Grade(
            student_id=submission.student_id,
            subject_id=slot.subject_id,
            exam_id=slot.exam_id,
            marks_obtained=submission.grade,
            total_marks=max_marks,
            percentage=percentage,
            letter_grade=letter_grade
        )
        db.add(new_grade)
            
    await db.commit()
    await db.refresh(submission)
    return submission
