"""add groups table and history fields to translation_jobs

Revision ID: 182436ab7233
Revises: 315fd023aae5
Create Date: 2026-09-21 11:09:46.481459

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '182436ab7233'
down_revision: Union[str, Sequence[str], None] = '315fd023aae5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'groups',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    # batch_alter_table: plain ALTER on Postgres, copy-and-move on SQLite (which can't add a FK
    # constraint to an existing table any other way) — see local dev's DATABASE_URL vs prod.
    with op.batch_alter_table('translation_jobs') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column('group_id', sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column('subtitle_url', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('thumbnail_url', sa.Text(), nullable=True))
        batch_op.create_foreign_key(
            'fk_translation_jobs_user_id', 'users', ['user_id'], ['id']
        )
        batch_op.create_foreign_key(
            'fk_translation_jobs_group_id', 'groups', ['group_id'], ['id']
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('translation_jobs') as batch_op:
        batch_op.drop_constraint('fk_translation_jobs_group_id', type_='foreignkey')
        batch_op.drop_constraint('fk_translation_jobs_user_id', type_='foreignkey')
        batch_op.drop_column('thumbnail_url')
        batch_op.drop_column('subtitle_url')
        batch_op.drop_column('group_id')
        batch_op.drop_column('user_id')
    op.drop_table('groups')
