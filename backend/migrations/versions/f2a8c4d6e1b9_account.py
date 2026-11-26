"""account: nome utente, password e codice di recupero sul profilo

Revision ID: f2a8c4d6e1b9
Revises: e1f7a9b3c5d2
Create Date: 2026-11-26 21:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "f2a8c4d6e1b9"
down_revision = "e1f7a9b3c5d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("username", sa.String(20), nullable=True))
    op.add_column("profiles", sa.Column("pw_hash", sa.String(200), nullable=True))
    op.add_column("profiles", sa.Column("recovery_hash", sa.String(200), nullable=True))
    op.create_index("ix_profiles_username", "profiles", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_profiles_username", table_name="profiles")
    op.drop_column("profiles", "recovery_hash")
    op.drop_column("profiles", "pw_hash")
    op.drop_column("profiles", "username")
