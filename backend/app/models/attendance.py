from datetime import datetime, date
from sqlalchemy import Integer, ForeignKey, Date, String, DateTime
from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    marked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "class_id", "date", name="uq_attendance_student_class_date"),
    )

    student = relationship("Student", backref="attendance_records")
    class_ref = relationship("Class", backref="attendance_records")

    def __repr__(self) -> str:
        return f"<Attendance(id={self.id}, student_id={self.student_id}, date={self.date}, status={self.status})>"