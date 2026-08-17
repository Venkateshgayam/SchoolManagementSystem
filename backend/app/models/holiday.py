from datetime import datetime, timezone, date
from sqlalchemy import Integer, ForeignKey, String, Date, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # "recurring" or "specific"
    day: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "Monday", "Tuesday", etc. (for recurring)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)  # YYYY-MM-DD (for specific)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=True)  # Null = school-wide
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class_ref = relationship("Class", backref="holidays")
    creator = relationship("User")

    __table_args__ = (
        Index("idx_holiday_recurring_unique", "day", unique=True, postgresql_where=(type == "recurring")),
        Index("idx_holiday_specific_unique", "class_id", "date", unique=True, postgresql_where=(type == "specific")),
    )

    def __repr__(self) -> str:
        return f"<Holiday(id={self.id}, type={self.type}, day={self.day}, date={self.date}, class_id={self.class_id})>"
