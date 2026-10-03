"""add sl and tp to trades

Revision ID: 2d139f8b825d
Revises: 00e60ff3a9cb
Create Date: 2026-09-27 03:21:54.946644

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d139f8b825d'
down_revision: Union[str, Sequence[str], None] = '00e60ff3a9cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('trades', sa.Column('sl', sa.Float(), nullable=True))
    op.add_column('trades', sa.Column('tp', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('trades', 'tp')
    op.drop_column('trades', 'sl')