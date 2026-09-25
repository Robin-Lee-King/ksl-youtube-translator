"""add screen_mode to users

Revision ID: 2b46944c1bf3
Revises: 4f72453ad937
Create Date: 2026-09-19 15:32:46.494875

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b46944c1bf3'
down_revision: Union[str, Sequence[str], None] = '4f72453ad937'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('screen_mode', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'screen_mode')
