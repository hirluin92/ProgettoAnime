"""mazzi personali nel profilo

Revision ID: a1c3e5b7d9f2
Revises: f2a8c4d6e1b9
Create Date: 2026-11-26 22:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "a1c3e5b7d9f2"
down_revision = "f2a8c4d6e1b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("mazzi", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "mazzi")
