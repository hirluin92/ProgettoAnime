"""quiz del giorno: Animedle e altri giochi

Revision ID: d5f7b9c1e3a4
Revises: c3e5a7b9d1f3
Create Date: 2026-11-27 12:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "d5f7b9c1e3a4"
down_revision = "c3e5a7b9d1f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quiz_giorno",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("profile_id", sa.String(36), nullable=False, index=True),
        sa.Column("gioco", sa.String(20), nullable=False),
        sa.Column("day", sa.String(10), nullable=False, index=True),
        sa.Column("tentativi", sa.Integer(), nullable=False),
        sa.Column("vinto", sa.Boolean(), nullable=False),
        sa.Column("crediti", sa.Integer(), nullable=False),
        sa.UniqueConstraint("profile_id", "gioco", "day", name="uq_quiz_giorno"),
    )


def downgrade() -> None:
    op.drop_table("quiz_giorno")
