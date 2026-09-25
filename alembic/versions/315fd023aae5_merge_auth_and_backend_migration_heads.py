"""merge auth and backend migration heads

Revision ID: 315fd023aae5
Revises: b39f52b2214d, fec223d22926
Create Date: 2026-09-21 10:36:15.390842

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '315fd023aae5'
down_revision: Union[str, Sequence[str], None] = ('b39f52b2214d', 'fec223d22926')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
