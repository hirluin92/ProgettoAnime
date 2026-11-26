"""ELO del profilo e rompicapo del giorno del Duello

Revision ID: e1f7a9b3c5d2
Revises: d4a8b6c2e915
Create Date: 2026-11-26 20:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "e1f7a9b3c5d2"
down_revision = "d4a8b6c2e915"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("elo", sa.Integer(), nullable=False, server_default="1200"))
    op.create_table(
        "duello_giorno",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("day", sa.String(10), nullable=False, index=True),
        sa.Column("name", sa.String(24), nullable=False),
        sa.Column("name_key", sa.String(24), nullable=False),
        sa.Column("stelle", sa.Integer(), nullable=False),
        sa.Column("punteggio", sa.Integer(), nullable=False),
        sa.UniqueConstraint("day", "name_key", name="uq_duello_giorno_name"),
    )


def downgrade() -> None:
    op.drop_table("duello_giorno")
    op.drop_column("profiles", "elo")
