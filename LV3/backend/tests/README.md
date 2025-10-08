# データベーステスト

POSアプリケーション (LV3) のデータベース層のテストファイルです。

## ファイル構成

```
tests/
├── __init__.py              # テストパッケージマーカー
├── conftest.py              # pytest フィクスチャ設定
├── test_models.py           # 基本的なCRUD操作テスト
└── test_constraints.py      # 制約・ビジネスロジックテスト
```

## テスト実行方法

### 全テスト実行

```bash
# プロジェクトルートから
cd LV3/backend

# 全テスト実行
PYTHONPATH=. uv run pytest tests/ -v

# または簡略化（pytest.ini設定済み）
uv run pytest
```

### 個別テスト実行

```bash
# 基本モデルテストのみ
uv run pytest tests/test_models.py -v

# 制約テストのみ
uv run pytest tests/test_constraints.py -v

# 特定のテストクラス
uv run pytest tests/test_models.py::TestProductModel -v

# 特定のテストメソッド
uv run pytest tests/test_models.py::TestProductModel::test_create_product -v
```

## テスト結果

- **総テスト数**: 20個
- **成功**: 19個 ✅
- **失敗**: 1個 ❌ (SQLiteの外部キー制約デフォルト無効による予想される動作)

詳細なテスト設計については、`/public/docs/tests/01_Database_Test_Design.md` を参照してください。
