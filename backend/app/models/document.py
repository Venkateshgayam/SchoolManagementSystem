from datetime import datetime, timezone
from sqlalchemy import Integer, ForeignKey, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    uploaded_by_user = relationship("User", backref="uploaded_documents")
    student = relationship("Student", backref="documents")

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, title={self.title})>"