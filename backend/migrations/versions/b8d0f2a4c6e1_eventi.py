"""eventi: tabella degli eventi anonimi di utilizzo

Revision ID: b8d0f2a4c6e1
Revises: a7c9e1b3d5f6
Create Date: 2026-11-28 12:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "b8d0f2a4c6e1"
down_revision = "a7c9e1b3d5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "eventi",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("giorno", sa.String(10), nullable=False),
        sa.Column("pid", sa.String(36), nullable=False),
        sa.Column("sessione", sa.String(36), nullable=False),
        sa.Column("nome", sa.String(16), nullable=False),
        sa.Column("props", sa.JSON(), nullable=False),
    )
    op.create_index("ix_eventi_giorno", "eventi", ["giorno"])
    op.create_index("ix_eventi_pid", "eventi", ["pid"])
    op.create_index("ix_eventi_nome", "eventi", ["nome"])


def downgrade() -> None:
    op.drop_index("ix_eventi_nome", table_name="eventi")
    op.drop_index("ix_eventi_pid", table_name="eventi")
    op.drop_index("ix_eventi_giorno", table_name="eventi")
    op.drop_table("eventi")
