"""Remove legacy roles

Revision ID: 1a3dd83cf342
Revises: 1a3dd83cf341
Create Date: 2026-08-11 10:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a3dd83cf342'
down_revision: Union[str, None] = '1a3dd83cf341'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update records
    op.execute("UPDATE users SET role = 'admin' WHERE role IN ('super_admin', 'management')")
    op.execute("UPDATE announcements SET target_role = 'all' WHERE target_role = 'management'")
    
    # 2. Recreate roleenum
    op.execute("ALTER TYPE roleenum RENAME TO roleenum_old")
    op.execute("CREATE TYPE roleenum AS ENUM ('admin', 'teacher', 'student')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE roleenum USING role::text::roleenum")
    op.execute("DROP TYPE roleenum_old")
    
    # 3. Recreate targetroleenum
    op.execute("ALTER TYPE targetroleenum RENAME TO targetroleenum_old")
    op.execute("CREATE TYPE targetroleenum AS ENUM ('all', 'students', 'teachers', 'admin')")
    op.execute("ALTER TABLE announcements ALTER COLUMN target_role TYPE targetroleenum USING target_role::text::targetroleenum")
    op.execute("DROP TYPE targetroleenum_old")


def downgrade() -> None:
    # 1. Recreate old roleenum
    op.execute("ALTER TYPE roleenum RENAME TO roleenum_new")
    op.execute("CREATE TYPE roleenum AS ENUM ('super_admin', 'admin', 'management', 'teacher', 'student')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE roleenum USING role::text::roleenum")
    op.execute("DROP TYPE roleenum_new")
    
    # 2. Recreate old targetroleenum
    op.execute("ALTER TYPE targetroleenum RENAME TO targetroleenum_new")
    op.execute("CREATE TYPE targetroleenum AS ENUM ('all', 'students', 'teachers', 'management')")
    op.execute("ALTER TABLE announcements ALTER COLUMN target_role TYPE targetroleenum USING target_role::text::targetroleenum")
    op.execute("DROP TYPE targetroleenum_new")
    
    # Note: Records cannot be automatically rolled back because 'super_admin'/'management' was irreversibly flattened into 'admin'.
    # Manual data restoration from legacy_roles_backup.json is required if needed.
