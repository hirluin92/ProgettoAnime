"""seed a 64 bit

Revision ID: b7a1c3d4e5f6
Revises: 8d2cc52c7356
Create Date: 2026-11-26 01:30:00
"""

import sqlalchemy as sa
from alembic import op

revision = "b7a1c3d4e5f6"
down_revision = "8d2cc52c7356"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("matches") as batch:
        batch.alter_column("seed", existing_type=sa.Integer(), type_=sa.BigInteger())


def downgrade() -> None:
    with op.batch_alter_table("matches") as batch:
        batch.alter_column("seed", existing_type=sa.BigInteger(), type_=sa.Integer())
