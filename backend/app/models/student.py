from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    roll_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    parent_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enrollment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="student_profile")
    class_ref = relationship("Class", backref="students")

    def __repr__(self) -> str:
        return f"<Student(id={self.id}, user_id={self.user_id}, roll_number={self.roll_number})>"