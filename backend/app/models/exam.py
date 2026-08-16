from datetime import datetime, timezone
import enum
from sqlalchemy import String, Integer, ForeignKey, DateTime, Float, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[ExamStatus] = mapped_column(SQLEnum(ExamStatus), default=ExamStatus.DRAFT)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    total_marks: Mapped[float | None] = mapped_column(Float, nullable=True)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class_ = relationship("Class")
    slots = relationship("ExamSubjectSlot", back_populates="exam", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Exam(id={self.id}, name={self.name}, exam_type={self.exam_type})>"

class ExamSubjectSlot(Base):
    __tablename__ = "exam_subject_slots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    exam = relationship("Exam", back_populates="slots")
    subject = relationship("Subject")
    teacher = relationship("Teacher")
    submissions = relationship("ExamSubmission", back_populates="slot", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ExamSubjectSlot(exam_id={self.exam_id}, subject_id={self.subject_id}, date={self.date})>"