from datetime import datetime, timezone, date
from sqlalchemy import Integer, ForeignKey, String, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class AcademicCalendar(Base):
    __tablename__ = "academic_calendar"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    school = relationship("School", backref="calendar_events")

    def __repr__(self) -> str:
        return f"<AcademicCalendar(id={self.id}, title={self.title}, event_date={self.event_date})>"