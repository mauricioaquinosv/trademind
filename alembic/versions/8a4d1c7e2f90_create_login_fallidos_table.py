"""create login_fallidos table

Revision ID: 8a4d1c7e2f90
Revises: 3b68949e55f4
Create Date: 2026-10-10

QUE ES ESTA TABLA

Cuenta los intentos de login fallidos, por email y por IP, para frenar la
fuerza bruta. La usa `app/login_freno.py`.

POR QUE ESTA ESCRITA A MANO Y NO CON --autogenerate

`--autogenerate` compara los modelos contra lo que hay en la base a la que
apunte DATABASE_URL, que en desarrollo es una creada con `Base.metadata.create_all`
(la que usan los tests). Ahi la tabla YA EXISTE, asi que alembic no ve nada que
hacer y escribe una migracion VACIA. Es la trampa de siempre: el autogenerado
solo sirve contra una base que este al dia de las migraciones, no contra una
creada a mano.

COMO AFIRMA ESTO

`tests/test_migraciones.py` comprueba que cada tabla de `models.py` aparece en
alguna migracion, y que todas tienen `downgrade()`. Ese test es lo que hacia
falta: sin el, anadir un modelo sin migratory no lo nota nadie, porque los tests
pasan (usan create_all), el build pasa y el guard pasa. Solo se ve al arrancar
contra una base de verdad, con un 500 en la pantalla de acceso.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a4d1c7e2f90'
down_revision: Union[str, Sequence[str], None] = '3b68949e55f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'login_fallidos',
        sa.Column('id', sa.UUID(), nullable=False),
        # email e ip son NOT NULL a proposito: una fila sin ellos no sirve para
        # contar nada, y dejarlos nullable permitiria guardar basura que el freno
        # nunca leeria.
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('ip', sa.String(), nullable=False),
        sa.Column('cuando', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    # Los tres indices van porque el freno consulta por email, por ip y limpia
    # los viejos por fecha. Sin el indice de `cuando`, esa limpieza seria un
    # recorrido entero de la tabla en cada login.
    op.create_index(op.f('ix_login_fallidos_email'), 'login_fallidos', ['email'], unique=False)
    op.create_index(op.f('ix_login_fallidos_ip'), 'login_fallidos', ['ip'], unique=False)
    op.create_index(op.f('ix_login_fallidos_cuando'), 'login_fallidos', ['cuando'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_login_fallidos_cuando'), table_name='login_fallidos')
    op.drop_index(op.f('ix_login_fallidos_ip'), table_name='login_fallidos')
    op.drop_index(op.f('ix_login_fallidos_email'), table_name='login_fallidos')
    op.drop_table('login_fallidos')