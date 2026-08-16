from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.user import User, RoleEnum
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/students", tags=["students"])


def _to_response(student: Student) -> StudentResponse:
    user = student.user
    return StudentResponse(
        id=student.id,
        user_id=student.user_id,
        full_name=user.full_name if user else None,
        email=user.email if user else None,
        username=user.username if user else None,
        roll_number=student.roll_number,
        class_id=student.class_id,
        parent_email=student.parent_email,
        address=student.address,
        date_of_birth=student.date_of_birth,
        enrollment_date=student.enrollment_date,
        status=student.status,
        created_at=student.created_at,
        updated_at=student.updated_at)


async def _teacher_class_ids(db: AsyncSession, current_user: dict) -> set:
    teacher = (
        await db.execute(select(Teacher).where(Teacher.user_id == int(current_user["sub"])))
    ).scalar_one_or_none()
    if not teacher:
        return set()
    from app.models.schedule import Schedule
    # 1. Homeroom classes
    homeroom_res = await db.execute(select(Class.id).where(Class.teacher_id == teacher.id))
    class_ids = set(homeroom_res.scalars().all())
    # 2. Schedule classes
    sched_res = await db.execute(select(Schedule.class_id).where(Schedule.teacher_id == teacher.id))
    class_ids.update(sched_res.scalars().all())
    return class_ids


@router.get("/me", response_model=StudentResponse)
async def get_current_student(
    current_user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.user_id == int(current_user["sub"]))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return _to_response(student)


@router.get("/", response_model=List[StudentResponse])
async def list_students(
    current_user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)):
    query = select(Student).options(selectinload(Student.user))
    if current_user.get("role") == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if not class_ids:
            return []
        query = query.where(Student.class_id.in_(class_ids))
    result = await db.execute(query)
    students = result.scalars().all()
    return [_to_response(s) for s in students]


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    current_user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    role = current_user.get("role")
    if role == "student":
        me = (
            await db.execute(select(Student).where(Student.user_id == int(current_user["sub"])))
        ).scalar_one_or_none()
        if not me or me.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif role == "teacher":
        class_ids = await _teacher_class_ids(db, current_user)
        if student.class_id not in class_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return _to_response(student)


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    request: StudentCreate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    if request.user_id:
        user = (
            await db.execute(select(User).where(User.id == request.user_id))
        ).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linked user not found")
        if user.role != RoleEnum.student:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linked user is not a student account")
    else:
        if not (request.full_name and request.email and request.username and request.password):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="full_name, email, username and password are required when no user_id is provided")
        if (await db.execute(select(User).where(User.email == request.email))).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        if (await db.execute(select(User).where(User.username == request.username))).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        user = User(
            email=request.email,
            username=request.username,
            password_hash=hash_password(request.password),
            role=RoleEnum.student,
            full_name=request.full_name,
            is_active=True)
        db.add(user)
        await db.flush()

    student = Student(
        user_id=user.id,
        roll_number=request.roll_number,
        class_id=request.class_id,
        parent_email=request.parent_email,
        address=request.address,
        date_of_birth=request.date_of_birth,
        enrollment_date=request.enrollment_date if request.enrollment_date else None,
        status=request.status)
    if not student.enrollment_date:
        from datetime import datetime, timezone
        student.enrollment_date = datetime.now(timezone.utc)
    db.add(student)
    await db.commit()
    
    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Student",
        entity_id=student.id,
        description=f"Created student {request.full_name or 'profile'}")
    await db.commit()

    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.id == student.id)
    )
    return _to_response(result.scalar_one())


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    request: StudentUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    user = student.user
    data = request.model_dump(exclude_unset=True)

    if data.get("email") and user:
        existing = (
            await db.execute(select(User).where(User.email == data["email"], User.id != user.id))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if data.get("username") and user:
        existing = (
            await db.execute(select(User).where(User.username == data["username"], User.id != user.id))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    profile_fields = {"roll_number", "class_id", "parent_email", "address", "date_of_birth", "status", "enrollment_date"}
    for key, value in data.items():
        if key in profile_fields:
            setattr(student, key, value)
        elif user is not None and key != "password":
            setattr(user, key, value)
    if user and data.get("password"):
        user.password_hash = hash_password(data["password"])

    await db.commit()
    
    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Student",
        entity_id=student.id,
        description=f"Updated student {user.full_name if user else student.id}")
    await db.commit()

    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.id == student.id)
    )
    return _to_response(result.scalar_one())


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    user = student.user
    if user:
        await db.execute(delete(User).where(User.id == user.id))
    else:
        await db.delete(student)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Student",
        entity_id=student_id,
        description=f"Deleted student {user.full_name if user else student_id}")
    await db.commit()
