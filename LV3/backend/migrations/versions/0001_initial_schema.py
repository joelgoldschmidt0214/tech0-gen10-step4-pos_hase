"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2025-10-08
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
  op.create_table(
    "products",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("product_code", sa.String(length=50), nullable=False, unique=True, index=True),
    sa.Column("name", sa.String(length=100), nullable=False),
    sa.Column("price", sa.Integer(), nullable=False),
    sa.Column("created_at", sa.DateTime(), nullable=True),
    sa.Column("updated_at", sa.DateTime(), nullable=True),
  )
  op.create_table(
    "local_products",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("product_code", sa.String(length=50), nullable=False, unique=True, index=True),
    sa.Column("name", sa.String(length=100), nullable=False),
    sa.Column("price", sa.Integer(), nullable=False),
    sa.Column("store_id", sa.String(length=50), nullable=False, index=True),
    sa.Column("created_at", sa.DateTime(), nullable=True),
    sa.Column("updated_at", sa.DateTime(), nullable=True),
  )
  op.create_table(
    "transactions",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("transaction_code", sa.String(length=50), nullable=True, unique=True),
    sa.Column("total_price", sa.Integer(), nullable=False),
    sa.Column("created_at", sa.DateTime(), nullable=True),
  )
  op.create_table(
    "transaction_details",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False),
    sa.Column("product_code", sa.String(length=50), nullable=False),
    sa.Column("product_name", sa.String(length=100), nullable=False),
    sa.Column("unit_price", sa.Integer(), nullable=False),
    sa.Column("quantity", sa.Integer(), nullable=False),
  )


def downgrade() -> None:
  op.drop_table("transaction_details")
  op.drop_table("transactions")
  op.drop_table("local_products")
  op.drop_table("products")
