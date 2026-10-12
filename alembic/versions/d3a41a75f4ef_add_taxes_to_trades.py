"""add taxes to trades

Revision ID: d3a41a75f4ef
Revises: 8a4d1c7e2f90
Create Date: 2026-10-12 00:00:00.000000

Migracion escrita a mano (no con --autogenerate): autogenerate no escribiria
nada aqui, porque compara el modelo contra la base de desarrollo y la columna
ya existiria si se hubiera creado con create_all.

La columna guarda la retencion de impuestos que MT4 reporta en su columna
"Taxes". MT5 no la trae, asi que en los reportes de MT5 siempre vale 0.

server_default='0' hace dos cosas a la vez, y ninguna es decorativa:

  1. Rellena con 0 las filas que ya existen. Sin esto, las filas antiguas
     quedarian con NULL y `TradeOut.taxes` (que es `float`, no opcional)
     devolveria un 500 al listar operaciones ya importadas.
  2. Garantiza que ninguna insercion posterior pueda dejar NULL.

Se hizo NOT NULL a proposito, aunque `commission` y `swap` no lo sean, por
el motivo 1.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3a41a75f4ef'
down_revision: Union[str, Sequence[str], None] = '8a4d1c7e2f90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'trades',
        sa.Column('taxes', sa.Float(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('trades', 'taxes')
