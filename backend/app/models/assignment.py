from datetime import datetime, timezone
import enum
from sqlalchemy import Integer, ForeignKey, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class AssignmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[AssignmentStatus] = mapped_column(SQLEnum(AssignmentStatus), default=AssignmentStatus.DRAFT)
    total_marks: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    subject = relationship("Subject", backref="assignments")
    class_ref = relationship("Class", backref="assignments")
    teacher = relationship("Teacher", backref="assignments")

    def __repr__(self) -> str:
        return f"<Assignment(id={self.id}, title={self.title})>"