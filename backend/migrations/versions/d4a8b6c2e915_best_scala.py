"""record della Scala nel profilo

Revision ID: d4a8b6c2e915
Revises: c9e2f1a07b34
Create Date: 2026-11-26 16:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "d4a8b6c2e915"
down_revision = "c9e2f1a07b34"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profiles", sa.Column("best_scala", sa.Integer(), nullable=False, server_default="0")
    )


def downgrade() -> None:
    op.drop_column("profiles", "best_scala")
