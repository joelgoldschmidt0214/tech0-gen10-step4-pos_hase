import pytest
from database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def test_db_session():
  """
  テスト用のデータベースセッションを提供するフィクスチャ
  各テスト関数ごとに新しいインメモリSQLiteDBを作成し、テスト後にクリーンアップします
  """
  # インメモリSQLiteデータベースエンジンを作成
  engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

  # テーブルを作成
  Base.metadata.create_all(bind=engine)

  # セッションを作成
  testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

  db = testing_session_local()
  try:
    yield db
  finally:
    db.close()


@pytest.fixture
def test_db_engine():
  """
  テスト用のデータベースエンジンを提供するフィクスチャ
  """
  engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
  Base.metadata.create_all(bind=engine)
  return engine
