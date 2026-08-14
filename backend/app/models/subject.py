from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


teacher_subjects = Table(
    "teacher_subjects",
    Base.metadata,
    Column("teacher_id", Integer, ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", Integer, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    school = relationship("School", backref="subjects")
    teachers = relationship("Teacher", secondary=teacher_subjects, backref="subjects")

    @property
    def teacher_ids(self) -> list[int]:
        return [t.id for t in self.teachers] if self.teachers else []

    def __repr__(self) -> str:
        return f"<Subject(id={self.id}, name={self.name}, code={self.code})>"