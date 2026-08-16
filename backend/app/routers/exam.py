from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.exam import Exam
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.core.dependencies import require_role, get_current_student
from app.utils.audit import write_audit_log

async def _notify_exam_students(db: AsyncSession, exam: Exam, title: str, message: str, notif_type: str):
    from app.models.notification import Notification
    from app.models.student import Student
    
    # Use the exam's target class_id directly — no Curriculum lookup needed.
    # class_id encodes both Class and Section (e.g. "Class 8 Section A" is a single row).
    if not exam.class_id:
        return
        
    students = await db.execute(select(Student).where(Student.class_id == exam.class_id))
    student_list = students.scalars().all()
    
    notifications = []
    for s in student_list:
        if s.user_id:
            notifications.append(Notification(
                user_id=s.user_id,
                title=title,
                message=message,
                type=notif_type
            ))
            
    if notifications:
        db.add_all(notifications)

router = APIRouter(prefix="/exams", tags=["exams"])


async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    result = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    return set(result.scalars().all())


async def _teacher_subject_ids_all_sources(db: AsyncSession, teacher_id: int) -> set[int]:
    """
    Return the set of subject IDs that belong to this teacher, checking every
    assignment mechanism used in the system:
      1. Schedule entries  (primary mechanism — seed data / timetable UI)
      2. teacher_subjects M2M  (subject-management UI "assign teacher" flow)
    Slot-level teacher_id is checked separately during exam-loop iteration.
    """
    from app.models.schedule import Schedule as ScheduleModel
    from app.models.subject import teacher_subjects as teacher_subjects_table

    # Source 1: Schedule table
    sched_result = await db.execute(
        select(ScheduleModel.subject_id).where(ScheduleModel.teacher_id == teacher_id)
    )
    ids: set[int] = set(sched_result.scalars().all())

    # Source 2: teacher_subjects M2M
    m2m_result = await db.execute(
        select(teacher_subjects_table.c.subject_id)
        .where(teacher_subjects_table.c.teacher_id == teacher_id)
    )
    ids.update(m2m_result.scalars().all())

    return ids


@router.get("/", response_model=List[ExamResponse])
async def list_exams(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)))
    exams = list(result.scalars().all())
    
    role = current_user.get("role")
    if role == "admin":
        return exams
        
    teacher_obj = None
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
    elif role == "teacher":
        from app.models.teacher import Teacher
        teacher_obj = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        
    # Pre-fetch teacher's subject IDs from ALL assignment sources
    teacher_subject_ids: set[int] = set()
    if role == "teacher" and teacher_obj:
        teacher_subject_ids = await _teacher_subject_ids_all_sources(db, teacher_obj.id)

    filtered_exams = []
    for exam in exams:
        if role == "student":
            # class_id encodes both Class and Section — an exact match guarantees
            # Class+Section targeting. No Curriculum lookup required.
            if not student.class_id or exam.class_id != student.class_id:
                continue
            filtered_exams.append(exam)
        elif role == "teacher":
            if not teacher_obj:
                continue
            # An exam is visible to teacher T if:
            #   a) any slot covers a subject T teaches (via schedule or M2M), OR
            #   b) any slot explicitly names T as the invigilating teacher, OR
            #   c) T personally created the exam (and it has no slots yet)
            is_subject_teacher = any(slot.subject_id in teacher_subject_ids for slot in exam.slots)
            is_slot_teacher    = any(slot.teacher_id == teacher_obj.id for slot in exam.slots)
            is_creator         = (exam.created_by == int(current_user["sub"]))
            if is_subject_teacher or is_slot_teacher or (is_creator and not exam.slots):
                filtered_exams.append(exam)

    return filtered_exams


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        
    role = current_user.get("role")
    if role == "admin":
        return exam
        
    class_ids = set()
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        if not student.class_id or exam.class_id != student.class_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        class_ids.add(student.class_id)
        
        from app.models.curriculum import Curriculum
        curricula = await db.execute(select(Curriculum.subject_id).where(Curriculum.class_id.in_(class_ids)))
        subject_ids = set(curricula.scalars().all())
        
        filtered_slots = [slot for slot in exam.slots if slot.subject_id in subject_ids]
        if not filtered_slots:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        exam.slots = filtered_slots
        
    elif role == "teacher":
        from app.models.teacher import Teacher
        teacher_obj2 = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not teacher_obj2:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        t_subj_ids = await _teacher_subject_ids_all_sources(db, teacher_obj2.id)
        is_subject_teacher = any(slot.subject_id in t_subj_ids for slot in exam.slots)
        is_slot_teacher    = any(slot.teacher_id == teacher_obj2.id for slot in exam.slots)
        is_creator         = (exam.created_by == int(current_user["sub"]))
        if not (is_subject_teacher or is_slot_teacher or is_creator):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return exam


@router.post("/", response_model=ExamResponse)
async def create_exam(
    request: ExamCreate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    from app.models.exam import ExamSubjectSlot
    exam_data = request.model_dump(exclude_unset=True)
    slots_data = exam_data.pop("slots", [])
    
    if slots_data:
        from app.models.subject import Subject
        subject_ids_to_validate = [s["subject_id"] for s in slots_data if "subject_id" in s]
        if subject_ids_to_validate:
            subjects_to_validate = await db.execute(select(Subject).options(selectinload(Subject.teachers)).where(Subject.id.in_(subject_ids_to_validate)))
            subject_map = {s.id: [t.id for t in s.teachers] for s in subjects_to_validate.scalars().all()}
            
            for slot in slots_data:
                sid = slot.get("subject_id")
                tid = slot.get("teacher_id")
                if tid is not None:
                    if sid not in subject_map or tid not in subject_map[sid]:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Teacher {tid} is not assigned to subject {sid}")
    
    role = current_user.get("role")
    if role == "teacher":
        from app.models.teacher import Teacher
        teacher = await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
        teacher = teacher.scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher profile not found")
        
        if slots_data:
            subject_ids = [slot["subject_id"] for slot in slots_data]
            valid_subject_ids = await _teacher_subject_ids_all_sources(db, teacher.id)
            for sid in subject_ids:
                if sid not in valid_subject_ids:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Not assigned to subject ID {sid}")
    
    exam = Exam(**exam_data)
    exam.created_by = int(current_user["sub"])
    
    if exam.total_marks is None:
        from app.core.settings import get_setting
        exam.total_marks = await get_setting(db, "default_exam_marks_scale", 100.0)
        
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    
    if slots_data:
        for slot in slots_data:
            new_slot = ExamSubjectSlot(
                exam_id=exam.id,
                **slot
            )
            db.add(new_slot)
        await db.commit()
    
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam.id))
    exam = result.scalar_one_or_none()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Exam",
        entity_id=exam.id,
        description=f"Created exam {exam.name}")
        
    await _notify_exam_students(
        db,
        exam,
        "New Exam Scheduled",
        f"A new exam '{exam.name}' has been scheduled.",
        "exam_created"
    )
    
    await db.commit()

    return exam


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    request: ExamUpdate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    from app.models.exam import ExamSubjectSlot
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        
    role = current_user.get("role")
    if role == "teacher":
        from app.models.teacher import Teacher
        teacher_chk = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not teacher_chk:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher profile not found")
        t_subj_ids2 = await _teacher_subject_ids_all_sources(db, teacher_chk.id)
        is_subj_teacher = any(slot.subject_id in t_subj_ids2 for slot in exam.slots)
        is_slot_teacher = any(slot.teacher_id == teacher_chk.id for slot in exam.slots)
        is_creator      = (exam.created_by == int(current_user["sub"]))
        if not (is_subj_teacher or is_slot_teacher or is_creator):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this exam")

    update_data = request.model_dump(exclude_unset=True)
    slots_data = update_data.pop("slots", None)
    
    if slots_data:
        from app.models.subject import Subject
        subject_ids_to_validate = [s["subject_id"] for s in slots_data if "subject_id" in s]
        if subject_ids_to_validate:
            subjects_to_validate = await db.execute(select(Subject).options(selectinload(Subject.teachers)).where(Subject.id.in_(subject_ids_to_validate)))
            subject_map = {s.id: [t.id for t in s.teachers] for s in subjects_to_validate.scalars().all()}
            
            for slot in slots_data:
                sid = slot.get("subject_id")
                tid = slot.get("teacher_id")
                if tid is not None:
                    if sid not in subject_map or tid not in subject_map[sid]:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Teacher {tid} is not assigned to subject {sid}")
                        
    if role == "teacher" and slots_data:
        from app.models.teacher import Teacher
        teacher = await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
        teacher = teacher.scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher profile not found")

        subject_ids = [slot["subject_id"] for slot in slots_data]
        valid_subject_ids = await _teacher_subject_ids_all_sources(db, teacher.id)
        for sid in subject_ids:
            if sid not in valid_subject_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Not assigned to subject ID {sid}")
    
    for key, value in update_data.items():
        setattr(exam, key, value)
        
    if slots_data is not None:
        # Simplest approach: Delete existing slots and recreate
        await db.execute(ExamSubjectSlot.__table__.delete().where(ExamSubjectSlot.exam_id == exam.id))
        for slot in slots_data:
            new_slot = ExamSubjectSlot(
                exam_id=exam.id,
                **slot
            )
            db.add(new_slot)
            
    await db.commit()
    
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam.id))
    exam = result.scalar_one_or_none()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Exam",
        entity_id=exam.id,
        description=f"Updated exam {exam.name}")
        
    await _notify_exam_students(
        db,
        exam,
        "Exam Updated",
        f"The exam '{exam.name}' schedule has been updated.",
        "exam_updated"
    )
    
    await db.commit()

    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Exam).options(selectinload(Exam.slots)).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    role = current_user.get("role")
    if role == "teacher" and exam.created_by != int(current_user["sub"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this exam")
        
    await db.delete(exam)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Exam",
        entity_id=exam_id,
        description=f"Deleted exam {exam_id}")
        
    await _notify_exam_students(
        db,
        exam,
        "Exam Cancelled",
        f"The exam '{exam.name}' has been cancelled.",
        "exam_deleted"
    )
    
    await db.commit()