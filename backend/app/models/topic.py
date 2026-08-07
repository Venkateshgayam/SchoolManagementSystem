from datetime import datetime
from sqlalchemy import Integer, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.database import Base


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    curriculum_id: Mapped[int] = mapped_column(ForeignKey("curriculum.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(default=0)

    curriculum = relationship("Curriculum", backref="topics")

    def __repr__(self) -> str:
        return f"<Topic(id={self.id}, title={self.title}, curriculum_id={self.curriculum_id})>"