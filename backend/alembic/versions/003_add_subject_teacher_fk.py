"""Add teacher_id to subjects

Revision ID: 003
Revises: 002
Create Date: 2026-08-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add nullable teacher_id foreign key to subjects
    op.add_column("subjects", sa.Column("teacher_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_subjects_teacher_id",
        "subjects",
        "teachers",
        ["teacher_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_subjects_teacher_id"), "subjects", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_subjects_teacher_id"), table_name="subjects")
    op.drop_constraint("fk_subjects_teacher_id", "subjects", type_="foreignkey")
    op.drop_column("subjects", "teacher_id")
