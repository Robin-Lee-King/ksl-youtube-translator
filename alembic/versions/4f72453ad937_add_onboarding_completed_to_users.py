"""add onboarding_completed to users

Revision ID: 4f72453ad937
Revises: a1c3f9e7d2b4
Create Date: 2026-09-17 17:13:42.666588

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f72453ad937'
down_revision: Union[str, Sequence[str], None] = 'a1c3f9e7d2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'onboarding_completed')
