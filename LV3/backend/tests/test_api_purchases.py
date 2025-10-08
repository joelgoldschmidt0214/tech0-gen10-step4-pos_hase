import app
import pytest
from database import Base, LocalProduct, Product, get_db
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def engine_memory():
  engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
  )
  Base.metadata.create_all(bind=engine)
  return engine


def override_factory(engine):
  SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

  def _override():
    db = SessionLocal()
    try:
      yield db
    finally:
      db.close()

  return _override


client = TestClient(app.app)


def seed_products(engine):
  SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
  with SessionLocal() as db:
    db.add(Product(product_code="P001", name="商品A", price=300))
    db.add(Product(product_code="P002", name="商品B", price=200))
    db.add(LocalProduct(product_code="LP003", name="ローカル商品C", price=150, store_id="S1"))
    db.commit()


def test_purchase_success(engine_memory):
  seed_products(engine_memory)
  app.app.dependency_overrides[get_db] = override_factory(engine_memory)
  payload = {
    "items": [
      {"product_code": "P001", "quantity": 2},  # 600
      {"product_code": "P002", "quantity": 1},  # 200
      {"product_code": "LP003", "quantity": 3},  # 450
    ],
  }
  response = client.post("/api/v1/purchases", json=payload)
  assert response.status_code == 200
  data = response.json()
  # 税抜合計 600+200+450=1250
  assert data["total_price_without_tax"] == 1250
  # 税額 1250 * 0.1 = 125 -> 合計 1375
  assert data["total_price_with_tax"] == 1375
  assert data["items_count"] == 3
  assert data["tax_rate"] == 0.10


def test_purchase_nonexistent_product(engine_memory):
  seed_products(engine_memory)
  app.app.dependency_overrides[get_db] = override_factory(engine_memory)
  payload = {"items": [{"product_code": "NOPE", "quantity": 1}]}
  response = client.post("/api/v1/purchases", json=payload)
  assert response.status_code == 400
  assert "NOPE" in response.json()["detail"]


def test_purchase_invalid_quantity(engine_memory):
  seed_products(engine_memory)
  app.app.dependency_overrides[get_db] = override_factory(engine_memory)
  payload = {"items": [{"product_code": "P001", "quantity": 0}]}
  response = client.post("/api/v1/purchases", json=payload)
  assert response.status_code == 400
  assert "数量が不正" in response.json()["detail"]


def test_purchase_empty_items(engine_memory):
  app.app.dependency_overrides[get_db] = override_factory(engine_memory)
  payload = {"items": []}
  response = client.post("/api/v1/purchases", json=payload)
  assert response.status_code == 400
  assert response.json()["detail"].startswith("リクエストが無効です。itemsが空")
