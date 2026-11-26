"""crediti e pacchetti nel profilo

Revision ID: b2d4f6a8c0e1
Revises: a1c3e5b7d9f2
Create Date: 2026-11-26 23:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "b2d4f6a8c0e1"
down_revision = "a1c3e5b7d9f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for nome in ("crediti", "pity", "pacchetti_aperti"):
        op.add_column(
            "profiles", sa.Column(nome, sa.Integer(), nullable=False, server_default="0")
        )


def downgrade() -> None:
    for nome in ("pacchetti_aperti", "pity", "crediti"):
        op.drop_column("profiles", nome)
