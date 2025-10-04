import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func
from sqlalchemy.orm import sessionmaker, declarative_base
from pydantic import BaseModel

# .envファイルから環境変数を読み込む
load_dotenv()

# --- データベース接続設定 ---
# .envファイルからDATABASE_URLを取得。なければSQLiteをデフォルトに。
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- SQLAlchemyモデル定義 (データベースのテーブル構造) ---
# Baseを継承してテーブルのモデルクラスを作成します

class Product(Base):
    """商品マスタモデル"""
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False) # 税抜価格
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class LocalProduct(Base):
    """ローカル拡張マスタモデル"""
    __tablename__ = 'local_products'

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False) # 税抜価格
    # どの店舗の商品かを識別するためのカラム (将来的拡張性)
    store_id = Column(String(50), index=True, nullable=False, default="default_store")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# ここに後ほど「取引ヘッダ」「取引明細」モデルも追加していきます


# --- Pydanticモデル定義 (APIのレスポンス形式) ---
# APIがJSONとして返すデータの型を定義します
# SQLAlchemyモデルからデータを読み取れるように `from_attributes = True` を設定します

class ProductSchema(BaseModel):
    id: int
    product_code: str
    name: str
    price: int

    class Config:
        from_attributes = True

class LocalProductSchema(BaseModel):
    id: int
    product_code: str
    name: str
    price: int
    store_id: str

    class Config:
        from_attributes = True

# --- DBセッションを管理するための関数 ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()