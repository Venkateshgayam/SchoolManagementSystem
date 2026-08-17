import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database.database import get_db
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.grade import Grade
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.notification import Notification
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from app.core.dependencies import require_role, get_current_active_user, get_current_student
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _clean_attachment_file(url: Optional[str]):
    if not url:
        return
    clean_path = url.split("?")[0].lstrip("/")
    possible_paths = [
        os.path.join("/app", clean_path),
        os.path.join(os.getcwd(), clean_path),
        os.path.abspath(clean_path),
    ]
    for p in possible_paths:
        try:
            if os.path.isfile(p):
                os.remove(p)
                break
        except Exception:
            pass

async def _notify_class_students(db: AsyncSession, class_id: int, title: str, message: str, notif_type: str):
    result = await db.execute(select(Student).where(Student.class_id == class_id))
    students = result.scalars().all()
    notifications = []
    for s in students:
        if s.user_id:
            notifications.append(Notification(
                user_id=s.user_id,
                title=title,
                message=message,
                type=notif_type
            ))
    if notifications:
        db.add_all(notifications)


from app.models.teacher_class_assignment import TeacherClassAssignment

async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    assigned_res = await db.execute(
        select(TeacherClassAssignment.class_id).where(TeacherClassAssignment.teacher_id == teacher.id)
    )
    assigned_ids = set(assigned_res.scalars().all())
    homeroom_res = await db.execute(
        select(Class.id).where(Class.teacher_id == teacher.id)
    )
    homeroom_ids = set(homeroom_res.scalars().all())
    return assigned_ids | homeroom_ids


@router.get("/", response_model=List[AssignmentResponse])
async def list_assignments(
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Assignment).where(Assignment.class_id == student.class_id))
    elif role == "teacher":
        teacher = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not teacher:
            return []
        result = await db.execute(select(Assignment).where(Assignment.teacher_id == teacher.id))
    else:
        result = await db.execute(select(Assignment))
    assignments = result.scalars().all()
    return assignments


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    role = current_user.get("role")
    if role == "student":
        student = await get_current_student(current_user=current_user, db=db)
        if assignment.class_id != student.class_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif role == "teacher":
        teacher = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not teacher or assignment.teacher_id != teacher.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return assignment


@router.post("/", response_model=AssignmentResponse)
async def create_assignment(
    request: AssignmentCreate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    
    if current_user.get("role") == "teacher":
        teacher = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher profile not found")
            
        if not request.teacher_id:
            request.teacher_id = teacher.id
            
        if request.subject_id:
            if teacher:
                from app.models.subject import teacher_subjects
                valid_subjects = await db.execute(
                    select(teacher_subjects.c.subject_id)
                    .where(
                        teacher_subjects.c.teacher_id == teacher.id,
                        teacher_subjects.c.subject_id == request.subject_id
                    )
                )
                if not valid_subjects.scalar_one_or_none():
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create assignment for a subject you do not teach")

    if request.subject_id and request.teacher_id:
        from app.models.subject import teacher_subjects
        valid_combo = await db.execute(
            select(teacher_subjects.c.subject_id)
            .where(
                teacher_subjects.c.teacher_id == request.teacher_id,
                teacher_subjects.c.subject_id == request.subject_id
            )
        )
        if not valid_combo.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Teacher {request.teacher_id} is not assigned to subject {request.subject_id}")
            
    assignment = Assignment(**request.model_dump(exclude_unset=True))
    db.add(assignment)
    
    if assignment.class_id:
        await _notify_class_students(
            db, 
            assignment.class_id, 
            "New Assignment", 
            f"A new assignment '{assignment.title}' has been created.",
            "assignment_created"
        )
        
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: int,
    request: AssignmentUpdate,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
        
    if current_user.get("role") == "teacher":
        teacher = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not teacher or assignment.teacher_id != teacher.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify assignment you do not own")
                
        # To avoid bypassing validation by omitting subject_id but modifying other fields,
        # we check the proposed new subject_id or the existing one
        target_subject_id = request.subject_id if request.subject_id is not None else assignment.subject_id
        if target_subject_id:
            from app.models.subject import teacher_subjects
            valid_subjects = await db.execute(
                select(teacher_subjects.c.subject_id)
                .where(
                    teacher_subjects.c.teacher_id == teacher.id,
                    teacher_subjects.c.subject_id == target_subject_id
                )
            )
            if not valid_subjects.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify assignment for a subject you do not teach")

    target_subject_id = request.subject_id if request.subject_id is not None else assignment.subject_id
    target_teacher_id = request.teacher_id if request.teacher_id is not None else assignment.teacher_id
    if target_subject_id and target_teacher_id:
        from app.models.subject import teacher_subjects
        valid_combo = await db.execute(
            select(teacher_subjects.c.subject_id)
            .where(
                teacher_subjects.c.teacher_id == target_teacher_id,
                teacher_subjects.c.subject_id == target_subject_id
            )
        )
        if not valid_combo.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Teacher {target_teacher_id} is not assigned to subject {target_subject_id}")
            
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(assignment, key, value)
        
    if assignment.class_id:
        await _notify_class_students(
            db,
            assignment.class_id,
            "Assignment Updated",
            f"The assignment '{assignment.title}' has been updated.",
            "assignment_updated"
        )
        
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
        
    role = current_user.get("role")
    if role == "teacher":
        teacher = (await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))).scalar_one_or_none()
        if not teacher or assignment.teacher_id != teacher.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete assignment you do not own")

    # 1. Collect and delete attachment files from submissions and the assignment itself
    sub_result = await db.execute(select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == assignment_id))
    submissions = sub_result.scalars().all()
    for sub in submissions:
        if sub.attachment_url:
            _clean_attachment_file(sub.attachment_url)
    if assignment.attachment_url:
        _clean_attachment_file(assignment.attachment_url)

    # 2. Cascade delete related Grade records
    await db.execute(delete(Grade).where(Grade.assignment_id == assignment_id))

    # 3. Cascade delete related AssignmentSubmission records
    await db.execute(delete(AssignmentSubmission).where(AssignmentSubmission.assignment_id == assignment_id))

    # 4. Notify class students
    if assignment.class_id:
        await _notify_class_students(
            db,
            assignment.class_id,
            "Assignment Deleted",
            f"The assignment '{assignment.title}' has been deleted.",
            "assignment_deleted"
        )

    # 5. Delete the assignment record
    await db.delete(assignment)

    # 6. Audit log
    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Assignment",
        entity_id=assignment_id,
        description=f"Deleted assignment {assignment.title}"
    )

    # 7. Commit transaction
    await db.commit()