import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, create_engine, func
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

BASE_DIR = Path(__file__).resolve().parent

# .envファイルから環境変数を読み込む
load_dotenv(override=True)

# --- データベース接続設定 ---
# .envから各設定を読み込む
DB_TYPE = os.getenv("DB_TYPE", "sqlite")  # どのDBを使うか切り替えるための変数
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
SSL_CERT_PATH = BASE_DIR / "DigiCertGlobalRootG2.crt.pem"

DATABASE_URL = ""

if DB_TYPE == "mysql":
  # DB_TYPEがmysqlの場合、MySQL用の接続文字列を組み立てる
  print("Azure Database for MySQLに接続します...")
  # SSL接続のための設定を追加
  connect_args = {"ssl": {"ca": str(SSL_CERT_PATH)}}
  DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
  engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
  # デフォルト (sqlite) の場合
  print("ローカル SQLite データベースに接続します...")
  DATABASE_URL = f"sqlite:///{BASE_DIR}/local.db"
  engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- SQLAlchemyモデル定義 (データベースのテーブル構造) ---
# Baseを継承してテーブルのモデルクラスを作成します


class Product(Base):
  """商品マスタモデル"""

  __tablename__ = "products"

  product_id = Column(String(13), primary_key=True, index=True)  # JANコード
  product_name = Column(String(100), nullable=False)
  price = Column(Integer, nullable=False)  # 税抜価格
  created_at = Column(DateTime, default=func.now())
  updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class LocalProduct(Base):
  """ローカル拡張マスタモデル"""

  __tablename__ = "local_products"

  product_id = Column(String(13), primary_key=True, index=True)  # JANコード
  product_name = Column(String(100), nullable=False)
  price = Column(Integer, nullable=False)  # 税抜価格
  store_id = Column(String(50), index=True, nullable=False, default="default_store")
  created_at = Column(DateTime, default=func.now())
  updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ここに後ほど「取引ヘッダ」「取引明細」モデルも追加していきます


class Transaction(Base):
  """取引ヘッダモデル"""

  __tablename__ = "transactions"

  id = Column(Integer, primary_key=True, index=True)
  transaction_code = Column(String(50), unique=True, nullable=True)  # 外部システム連携用
  total_price = Column(Integer, nullable=False)  # 合計金額（税抜）
  created_at = Column(DateTime, default=func.now())
  # 関連する明細（カスケード削除 & orphan削除）
  details = relationship(
    "TransactionDetail",
    backref="transaction",
    cascade="all, delete-orphan",
    passive_deletes=True,
  )


class TransactionDetail(Base):
  """取引明細モデル"""

  __tablename__ = "transaction_details"

  id = Column(Integer, primary_key=True, index=True)
  transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
  product_code = Column(String(50), nullable=False)  # 購入された商品のコード
  product_name = Column(String(100), nullable=False)  # 購入時点の商品名（冗長化）
  unit_price = Column(Integer, nullable=False)  # 購入時点の単価（税抜、冗長化）
  quantity = Column(Integer, nullable=False)  # 購入数量


# --- Pydanticモデル定義 (APIのレスポンス形式) ---
# APIがJSONとして返すデータの型を定義します
# SQLAlchemyモデルからデータを読み取れるように `from_attributes = True` を設定します


class ProductSchema(BaseModel):
  id: int
  product_code: str
  name: str
  price: int
  model_config = ConfigDict(from_attributes=True)


class LocalProductSchema(BaseModel):
  id: int
  product_code: str
  name: str
  price: int
  store_id: str
  model_config = ConfigDict(from_attributes=True)


class TransactionSchema(BaseModel):
  id: int
  transaction_code: str | None
  total_price: int
  created_at: datetime
  model_config = ConfigDict(from_attributes=True)


class TransactionDetailSchema(BaseModel):
  id: int
  transaction_id: int
  product_code: str
  product_name: str
  unit_price: int
  quantity: int
  model_config = ConfigDict(from_attributes=True)


# --- Purchase API用スキーマ ---
class PurchaseItemRequest(BaseModel):
  product_code: str
  quantity: int


class PurchaseRequest(BaseModel):
  items: list[PurchaseItemRequest]


class PurchaseResponse(BaseModel):
  transaction_id: str
  total_price_without_tax: int
  total_price_with_tax: int
  tax_rate: float
  items_count: int
  transaction_code: str | None = None


# --- DBセッションを管理するための関数 ---
def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
