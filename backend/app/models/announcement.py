from datetime import datetime, timezone
from sqlalchemy import Integer, ForeignKey, String, Text, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base
import enum


class TargetRoleEnum(str, enum.Enum):
    all = "all"
    students = "students"
    teachers = "teachers"
    admin = "admin"


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_role: Mapped[str | None] = mapped_column(SQLEnum(TargetRoleEnum), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)

    dismissals = relationship("AnnouncementDismissal", back_populates="announcement", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Announcement(id={self.id}, title={self.title})>"


class AnnouncementDismissal(Base):
    __tablename__ = "announcement_dismissals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    announcement_id: Mapped[int] = mapped_column(ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dismissed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    announcement = relationship("Announcement", back_populates="dismissals")

    def __repr__(self) -> str:
        return f"<AnnouncementDismissal(announcement_id={self.announcement_id}, user_id={self.user_id})>"