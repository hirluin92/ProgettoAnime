"""profili, giorni dei profili e stagioni

Revision ID: c9e2f1a07b34
Revises: b7a1c3d4e5f6
Create Date: 2026-11-26 14:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "c9e2f1a07b34"
down_revision = "b7a1c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=24), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False),
        sa.Column("partite", sa.Integer(), nullable=False),
        sa.Column("vittorie", sa.Integer(), nullable=False),
        sa.Column("collezione", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "profile_days",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("day", sa.String(length=10), nullable=False),
        sa.Column("fatti", sa.JSON(), nullable=False),
        sa.Column("primo", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("profile_id", "day", name="uq_profile_day"),
    )
    op.create_index(op.f("ix_profile_days_profile_id"), "profile_days", ["profile_id"])
    op.create_table(
        "season_scores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("season", sa.String(length=7), nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=24), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("season", "profile_id", name="uq_season_profile"),
    )
    op.create_index(op.f("ix_season_scores_season"), "season_scores", ["season"])


def downgrade() -> None:
    op.drop_index(op.f("ix_season_scores_season"), table_name="season_scores")
    op.drop_table("season_scores")
    op.drop_index(op.f("ix_profile_days_profile_id"), table_name="profile_days")
    op.drop_table("profile_days")
    op.drop_table("profiles")
