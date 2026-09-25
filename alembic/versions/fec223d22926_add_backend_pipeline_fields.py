"""add backend pipeline fields

Revision ID: fec223d22926
Revises: 4f8397f4d1e2
Create Date: 2026-09-19 17:06:53.210553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fec223d22926'
down_revision: Union[str, Sequence[str], None] = '4f8397f4d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('transcript_segments', sa.Column('corrected_text', sa.Text(), nullable=True))
    op.add_column('translation_jobs', sa.Column('failed_stage', sa.String(length=50), nullable=True))
    op.add_column('translation_jobs', sa.Column('error_code', sa.String(length=100), nullable=True))
    op.add_column('translation_jobs', sa.Column('result_video_url', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('translation_jobs', 'result_video_url')
    op.drop_column('translation_jobs', 'error_code')
    op.drop_column('translation_jobs', 'failed_stage')
    op.drop_column('transcript_segments', 'corrected_text')
