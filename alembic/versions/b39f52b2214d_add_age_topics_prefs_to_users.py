"""add age topics prefs to users

Revision ID: b39f52b2214d
Revises: 2b46944c1bf3
Create Date: 2026-09-19 22:02:29.549041

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b39f52b2214d'
down_revision: Union[str, Sequence[str], None] = '2b46944c1bf3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('age', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('topics', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('prefs', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'prefs')
    op.drop_column('users', 'topics')
    op.drop_column('users', 'age')
