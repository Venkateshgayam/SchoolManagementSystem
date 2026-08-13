from datetime import datetime, timezone, date
from sqlalchemy import Integer, ForeignKey, Float, Date, String, DateTime, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base
import enum


class FeeStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    WAIVED = "WAIVED"


class Fee(Base):
    __tablename__ = "fees"
    __table_args__ = (
        UniqueConstraint('student_id', 'academic_year', name='uq_student_academic_year'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    waiver_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[FeeStatusEnum] = mapped_column(SQLEnum(FeeStatusEnum), default=FeeStatusEnum.PENDING)
    academic_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    student = relationship("Student", backref="fees")

    def __repr__(self) -> str:
        return f"<Fee(id={self.id}, student_id={self.student_id}, amount_paid={self.amount_paid}, status={self.status})>"