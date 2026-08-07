from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.core.dependencies import require_role, get_current_student

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get("role") == "student":
        student = await get_current_student(current_user=current_user, db=db)
        result = await db.execute(select(Document).where(Document.student_id == student.id))
    else:
        result = await db.execute(select(Document))
    documents = result.scalars().all()
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher", "student")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if current_user.get("role") == "student" and document.student_id != (await get_current_student(current_user=current_user, db=db)).id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return document


@router.post("/", response_model=DocumentResponse)
async def create_document(
    request: DocumentCreate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    data = request.model_dump(exclude_unset=True)
    data["uploaded_by"] = int(current_user["sub"])
    document = Document(**data)
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    request: DocumentUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin", "management")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(document, key, value)
    await db.commit()
    await db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await db.delete(document)
    await db.commit()