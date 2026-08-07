"""Add created_at/updated_at to fees

Revision ID: 002
Revises: 001
Create Date: 2026-08-06 11:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def column_exists(connection, table_name: str, column_name: str) -> bool:
    result = connection.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :table AND column_name = :column"
        ),
        {"table": table_name, "column": column_name},
    )
    return result.first() is not None


def upgrade() -> None:
    bind = op.get_bind()
    if column_exists(bind, "fees", "created_at"):
        return
    op.add_column(
        "fees",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.add_column(
        "fees",
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_column("fees", "updated_at")
    op.drop_column("fees", "created_at")
