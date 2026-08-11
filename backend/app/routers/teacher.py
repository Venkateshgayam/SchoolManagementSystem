from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.models.teacher import Teacher
from app.models.user import User, RoleEnum
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.utils.audit import write_audit_log

router = APIRouter(prefix="/teachers", tags=["teachers"])


def _to_response(teacher: Teacher) -> TeacherResponse:
    user = teacher.user
    return TeacherResponse(
        id=teacher.id,
        user_id=teacher.user_id,
        full_name=user.full_name if user else None,
        email=user.email if user else None,
        username=user.username if user else None,
        qualification=teacher.qualification,
        experience_years=teacher.experience_years,
        employment_date=teacher.employment_date,
        status=teacher.status,
        created_at=teacher.created_at,
        updated_at=teacher.updated_at,
    )


@router.get("/me", response_model=TeacherResponse)
async def read_current_teacher(
    current_user: dict = Depends(require_role("teacher")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.user)).where(Teacher.user_id == int(current_user["sub"]))
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")
    return _to_response(teacher)


@router.get("/", response_model=List[TeacherResponse])
async def list_teachers(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Teacher).options(selectinload(Teacher.user)))
    teachers = result.scalars().all()
    return [_to_response(t) for t in teachers]


@router.get("/{teacher_id}", response_model=TeacherResponse)
async def get_teacher(
    teacher_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.user)).where(Teacher.id == teacher_id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    return _to_response(teacher)


@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    request: TeacherCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    if request.user_id:
        user = (
            await db.execute(select(User).where(User.id == request.user_id))
        ).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linked user not found")
        if user.role != RoleEnum.teacher:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linked user is not a teacher account")
    else:
        if not (request.full_name and request.email and request.username and request.password):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="full_name, email, username and password are required when no user_id is provided",
            )
        if (await db.execute(select(User).where(User.email == request.email))).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        if (await db.execute(select(User).where(User.username == request.username))).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        user = User(
            email=request.email,
            username=request.username,
            password_hash=hash_password(request.password),
            role=RoleEnum.teacher,
            full_name=request.full_name,
            is_active=True,
        )
        db.add(user)
        await db.flush()

    teacher = Teacher(
        user_id=user.id,
        qualification=request.qualification,
        experience_years=request.experience_years,
        employment_date=request.employment_date,
        status=request.status,
    )
    db.add(teacher)
    db.add(teacher)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="CREATE",
        entity_type="Teacher",
        entity_id=teacher.id,
        description=f"Created teacher {request.full_name or 'profile'}",
    )
    await db.commit()

    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.user)).where(Teacher.id == teacher.id)
    )
    return _to_response(result.scalar_one())


@router.put("/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(
    teacher_id: int,
    request: TeacherUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.user)).where(Teacher.id == teacher_id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    user = teacher.user
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

    profile_fields = {"qualification", "experience_years", "employment_date", "status"}
    for key, value in data.items():
        if key in profile_fields:
            setattr(teacher, key, value)
        elif user is not None and key != "password":
            setattr(user, key, value)
    if user and data.get("password"):
        user.password_hash = hash_password(data["password"])

    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="UPDATE",
        entity_type="Teacher",
        entity_id=teacher.id,
        description=f"Updated teacher {user.full_name if user else teacher.id}",
    )
    await db.commit()

    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.user)).where(Teacher.id == teacher.id)
    )
    return _to_response(result.scalar_one())


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    teacher_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.user)).where(Teacher.id == teacher_id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    user = teacher.user
    if user:
        await db.execute(delete(User).where(User.id == user.id))
    else:
        await db.delete(teacher)
    await db.commit()

    await write_audit_log(
        db,
        user_id=int(current_user["sub"]) if current_user else None,
        action="DELETE",
        entity_type="Teacher",
        entity_id=teacher_id,
        description=f"Deleted teacher {user.full_name if user else teacher_id}",
    )
    await db.commit()
