"""add accounts table and account_id to trades

Revision ID: 00e60ff3a9cb
Revises: 2e83025b29e0
Create Date: 2026-09-26 14:55:36.085981

"""
import uuid
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00e60ff3a9cb'
down_revision: Union[str, Sequence[str], None] = '2e83025b29e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('accounts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('initial_balance', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_accounts_user_id'), 'accounts', ['user_id'], unique=False)

    # account_id se agrega primero como opcional, para poder rellenarlo en los
    # trades que ya existen antes de volverlo obligatorio.
    op.add_column('trades', sa.Column('account_id', sa.UUID(), nullable=True))

    accounts_table = sa.table(
        'accounts',
        sa.column('id', sa.UUID()),
        sa.column('user_id', sa.UUID()),
        sa.column('name', sa.String()),
        sa.column('initial_balance', sa.Float()),
        sa.column('currency', sa.String()),
        sa.column('source', sa.String()),
        sa.column('created_at', sa.DateTime()),
    )
    trades_table = sa.table(
        'trades',
        sa.column('account_id', sa.UUID()),
        sa.column('user_id', sa.UUID()),
    )

    conn = op.get_bind()

    # Crea una cuenta "Prueba cuenta MT5" por cada usuario que ya tenga
    # trades guardados, y le asigna esos trades existentes.
    result = conn.execute(sa.text('SELECT DISTINCT user_id FROM trades'))
    for row in result:
        user_id = row[0]
        account_id = uuid.uuid4()
        conn.execute(
            accounts_table.insert().values(
                id=account_id,
                user_id=user_id,
                name='Prueba cuenta MT5',
                initial_balance=0.0,
                currency='USD',
                source='csv',
                created_at=datetime.utcnow(),
            )
        )
        conn.execute(
            trades_table.update()
            .where(trades_table.c.user_id == user_id)
            .values(account_id=account_id)
        )

    op.alter_column('trades', 'account_id', nullable=False)
    op.create_index(op.f('ix_trades_account_id'), 'trades', ['account_id'], unique=False)
    op.create_foreign_key(None, 'trades', 'accounts', ['account_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_trades_account_id'), table_name='trades')
    op.drop_column('trades', 'account_id')
    op.drop_index(op.f('ix_accounts_user_id'), table_name='accounts')
    op.drop_table('accounts')