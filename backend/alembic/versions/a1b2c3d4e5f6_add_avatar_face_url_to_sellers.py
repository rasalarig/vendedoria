"""add avatar_face_url to sellers

Revision ID: a1b2c3d4e5f6
Revises: 95f83d5fbff1
Create Date: 2026-03-20 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '95f83d5fbff1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add avatar_face_url column to sellers table."""
    op.add_column('sellers', sa.Column('avatar_face_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Remove avatar_face_url column from sellers table."""
    op.drop_column('sellers', 'avatar_face_url')
