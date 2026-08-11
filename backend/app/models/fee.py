from datetime import datetime, date
from sqlalchemy import Integer, ForeignKey, Float, Date, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base
import enum


class FeeStatusEnum(str, enum.Enum):
    unpaid = "unpaid"
    partial = "partial"
    pending = "pending"
    paid = "paid"
    overdue = "overdue"


class Fee(Base):
    __tablename__ = "fees"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    waiver_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(SQLEnum(FeeStatusEnum), default="unpaid")
    academic_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", backref="fees")

    def __repr__(self) -> str:
        return f"<Fee(id={self.id}, student_id={self.student_id}, amount_paid={self.amount_paid}, status={self.status})>"