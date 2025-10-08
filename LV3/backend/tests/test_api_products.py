import app
import pytest
from database import Base, LocalProduct, Product, get_db
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def test_engine():
  """インメモリSQLiteエンジン (StaticPool) を提供して同一接続を共有しテーブルを保持。"""
  engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
  )
  Base.metadata.create_all(bind=engine)
  return engine


def make_session_factory(engine):
  return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_db_factory(engine):
  session_local = make_session_factory(engine)

  def _override():
    db = session_local()
    try:
      yield db
    finally:
      db.close()

  return _override


client = TestClient(app.app)


def test_get_product_success(test_engine):
  session_local = make_session_factory(test_engine)
  with session_local() as db:
    db.add(Product(product_code="SEARCH001", name="検索商品", price=500))
    db.commit()

  app.app.dependency_overrides[get_db] = override_db_factory(test_engine)
  response = client.get("/api/v1/products/SEARCH001")
  assert response.status_code == 200
  data = response.json()
  assert data == {"id": 1, "product_code": "SEARCH001", "name": "検索商品", "price": 500}


def test_get_product_prefers_regular_over_local(test_engine):
  session_local = make_session_factory(test_engine)
  with session_local() as db:
    db.add(Product(product_code="DUP001", name="通常商品", price=100))
    db.add(LocalProduct(product_code="DUP001", name="ローカル商品", price=150, store_id="S1"))
    db.commit()

  app.app.dependency_overrides[get_db] = override_db_factory(test_engine)
  response = client.get("/api/v1/products/DUP001")
  assert response.status_code == 200
  data = response.json()
  assert data["name"] == "通常商品"  # 通常商品が優先される
  assert data["price"] == 100


def test_get_product_not_found(test_engine):
  app.app.dependency_overrides[get_db] = override_db_factory(test_engine)
  response = client.get("/api/v1/products/NOPE001")
  assert response.status_code == 404
  assert response.json()["detail"] == "商品が見つかりません"
