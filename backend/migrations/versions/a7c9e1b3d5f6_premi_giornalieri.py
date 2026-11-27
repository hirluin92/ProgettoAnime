"""tetto giornaliero ai premi

Revision ID: a7c9e1b3d5f6
Revises: d5f7b9c1e3a4
Create Date: 2026-11-27 18:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "a7c9e1b3d5f6"
down_revision = "d5f7b9c1e3a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profile_days",
        sa.Column("premiate", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("profile_days", "premiate")
