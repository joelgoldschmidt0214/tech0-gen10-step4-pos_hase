import os
import sys
from pathlib import Path

import pytest

# ルートディレクトリをPythonパスへ追加（pytestが -m で起動され pythonpath= が効かないケース対策）
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
  sys.path.insert(0, str(ROOT))

from database import Base  # noqa: E402
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def test_db_session():
  """
  テスト用のデータベースセッションを提供するフィクスチャ
  各テスト関数ごとに新しいインメモリSQLiteDBを作成し、テスト後にクリーンアップします
  """
  # インメモリSQLiteデータベースエンジンを作成
  engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

  # 外部キー制約を有効化
  @event.listens_for(engine, "connect")
  def _set_sqlite_pragma(dbapi_connection, connection_record):  # noqa: D401, ANN001
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

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
