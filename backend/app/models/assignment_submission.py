from datetime import datetime, timezone
from sqlalchemy import Integer, ForeignKey, Text, String, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    submission_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    grade: Mapped[float | None] = mapped_column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_submission"),
    )

    assignment = relationship("Assignment", backref="submissions")
    student = relationship("Student", backref="assignment_submissions")

    def __repr__(self) -> str:
        return f"<AssignmentSubmission(id={self.id}, assignment_id={self.assignment_id}, student_id={self.student_id})>"