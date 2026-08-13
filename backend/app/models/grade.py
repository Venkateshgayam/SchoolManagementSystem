from datetime import datetime, timezone
from sqlalchemy import Integer, ForeignKey, Float, DateTime, UniqueConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class Grade(Base):
    __tablename__ = "grades"
    __table_args__ = (
        UniqueConstraint('student_id', 'subject_id', 'exam_id', name='uq_student_subject_exam'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    exam_id: Mapped[int | None] = mapped_column(ForeignKey("exams.id", ondelete="SET NULL"), nullable=True)
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, nullable=False)
    percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    letter_grade: Mapped[str | None] = mapped_column(String(5), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    student = relationship("Student", backref="grades")
    subject = relationship("Subject", backref="grades")

    def __repr__(self) -> str:
        return f"<Grade(id={self.id}, student_id={self.student_id}, subject_id={self.subject_id}, percentage={self.percentage})>"