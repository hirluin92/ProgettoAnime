"""ranked: mmr, fantasmi e obiettivi settimanali

Revision ID: c3e5a7b9d1f3
Revises: b2d4f6a8c0e1
Create Date: 2026-11-27 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "c3e5a7b9d1f3"
down_revision = "b2d4f6a8c0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("mmr", sa.Integer(), nullable=False, server_default="1000"))
    op.add_column(
        "profiles", sa.Column("ranked_partite", sa.Integer(), nullable=False, server_default="0")
    )
    op.create_table(
        "ranked_ghosts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("profile_id", sa.String(36), nullable=False, index=True),
        sa.Column("name", sa.String(24), nullable=False),
        sa.Column("mmr", sa.Integer(), nullable=False, index=True),
        sa.Column("mazzo", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "ranked_settimane",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("profile_id", sa.String(36), nullable=False, index=True),
        sa.Column("settimana", sa.String(8), nullable=False),
        sa.Column("partite", sa.Integer(), nullable=False),
        sa.Column("ritirati", sa.JSON(), nullable=True),
        sa.UniqueConstraint("profile_id", "settimana", name="uq_ranked_sett"),
    )


def downgrade() -> None:
    op.drop_table("ranked_settimane")
    op.drop_table("ranked_ghosts")
    op.drop_column("profiles", "ranked_partite")
    op.drop_column("profiles", "mmr")
