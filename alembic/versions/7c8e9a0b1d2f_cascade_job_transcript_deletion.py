"""Cascade transcript segment deletion when a translation job is deleted.

Revision ID: 7c8e9a0b1d2f
Revises: 182436ab7233
"""
from alembic import op

revision = "7c8e9a0b1d2f"
down_revision = "182436ab7233"
branch_labels = None
depends_on = None

FK_NAME = "transcript_segments_translation_job_id_fkey"
# Also names SQLite's previously unnamed FK during batch reflection.
NAMING_CONVENTION = {"fk": "%(table_name)s_%(column_0_name)s_fkey"}


def _replace_foreign_key(ondelete: str | None) -> None:
    with op.batch_alter_table(
        "transcript_segments", naming_convention=NAMING_CONVENTION
    ) as batch_op:
        batch_op.drop_constraint(FK_NAME, type_="foreignkey")
        batch_op.create_foreign_key(
            FK_NAME,
            "translation_jobs",
            ["translation_job_id"],
            ["id"],
            ondelete=ondelete,
        )


def upgrade() -> None:
    _replace_foreign_key("CASCADE")


def downgrade() -> None:
    _replace_foreign_key(None)
