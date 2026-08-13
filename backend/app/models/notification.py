from datetime import datetime, timezone
from sqlalchemy import Integer, ForeignKey, String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="notifications")

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, user_id={self.user_id}, title={self.title})>"