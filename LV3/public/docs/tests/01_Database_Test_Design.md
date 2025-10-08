# POSアプリケーション (LV3) データベーステスト設計書

## 1. 概要

このドキュメントは、POSアプリケーション (LV3) のデータベース層のテスト設計および実装について説明します。

### 1.1. テスト対象

- **SQLAlchemyモデル**: Product, LocalProduct, Transaction, TransactionDetail
- **データベース制約**: ユニーク制約、外部キー制約、NOT NULL制約
- **ビジネスロジック**: 取引計算、商品検索優先順位

### 1.2. テスト環境

- **テストフレームワーク**: pytest
- **データベース**: SQLite (インメモリ)
- **ORMライブラリ**: SQLAlchemy
- **実行方法**: `PYTHONPATH=. uv run pytest tests/ -v`

---

## 2. テストファイル構成

```
LV3/backend/tests/
├── conftest.py              # テスト用データベース設定
├── test_models.py           # 基本的なCRUD操作テスト
└── test_constraints.py      # 制約・ビジネスロジックテスト
```

### 2.1. conftest.py

テスト実行時に共通で使用されるフィクスチャを定義。

- **test_db_session**: インメモリSQLiteを使用したテスト用データベースセッション
- **test_db_engine**: テスト用データベースエンジン

### 2.2. test_models.py

各SQLAlchemyモデルの基本的なCRUD操作をテスト。

### 2.3. test_constraints.py

データベース制約とビジネスロジックをテスト。

---

## 3. テストケース詳細

### 3.1. Product (商品マスタ) テスト

| テストケース | 目的 | 検証内容 |
|:-----------|:-----|:---------|
| `test_create_product` | 商品作成 | 商品データの正常な作成・保存 |
| `test_product_code_unique_constraint` | ユニーク制約 | 商品コードの重複エラー発生 |
| `test_update_product` | 商品更新 | 商品情報の正常な更新 |
| `test_delete_product` | 商品削除 | 商品データの正常な削除 |

#### 3.1.1. test_create_product

**目的**: 商品マスタに新しい商品を正常に作成できることを確認

**テストデータ**:

```python
Product(
    product_code="TEST001",
    name="テスト商品",
    price=100
)
```

**検証項目**:

- 商品データが正常に保存される
- `created_at`, `updated_at`が自動設定される
- 全てのフィールドが期待値と一致する

### 3.2. LocalProduct (ローカル拡張マスタ) テスト

| テストケース | 目的 | 検証内容 |
|:-----------|:-----|:---------|
| `test_create_local_product` | ローカル商品作成 | ローカル商品データの正常な作成・保存 |
| `test_local_product_default_store_id` | デフォルト値 | store_idのデフォルト値設定 |

#### 3.2.1. test_local_product_default_store_id

**目的**: `store_id`を指定しない場合にデフォルト値が設定されることを確認

**期待値**: `store_id = "default_store"`

### 3.3. Transaction (取引ヘッダ) テスト

| テストケース | 目的 | 検証内容 |
|:-----------|:-----|:---------|
| `test_create_transaction` | 取引作成 | 取引データの正常な作成・保存 |
| `test_create_transaction_without_code` | NULLable確認 | transaction_codeなしでの作成 |

### 3.4. TransactionDetail (取引明細) テスト

| テストケース | 目的 | 検証内容 |
|:-----------|:-----|:---------|
| `test_create_transaction_detail` | 明細作成 | 取引明細データの正常な作成・保存 |
| `test_transaction_detail_foreign_key` | 外部キー制約 | 存在しない取引IDでの制約エラー |

### 3.5. 複合テスト

| テストケース | 目的 | 検証内容 |
|:-----------|:-----|:---------|
| `test_complete_transaction_flow` | 完全な取引フロー | 取引ヘッダ + 複数明細の作成 |
| `test_delete_transaction_with_details` | カスケード削除 | 取引削除時の明細への影響 |

---

## 4. 制約テスト

### 4.1. ユニーク制約テスト

| 対象テーブル | 対象カラム | テストケース | 期待結果 |
|:-----------|:----------|:-----------|:--------|
| products | product_code | 同一商品コードで重複作成 | IntegrityError |
| local_products | product_code | 同一商品コードで重複作成 | IntegrityError |
| transactions | transaction_code | 同一取引コードで重複作成 | IntegrityError |

### 4.2. 外部キー制約テスト

| 参照元テーブル | 参照先テーブル | テストケース | 期待結果 |
|:-------------|:-------------|:-----------|:--------|
| transaction_details | transactions | 存在しない取引IDで明細作成 | IntegrityError |

**注意**: SQLiteではデフォルトで外部キー制約が無効のため、専用のフィクスチャで有効化してテスト

---

## 5. ビジネスロジックテスト

### 5.1. 取引合計金額計算テスト

**目的**: 取引明細から正しく合計金額が計算されることを確認

**テストシナリオ**:

```
商品1: 300円 × 2個 = 600円
商品2: 150円 × 3個 = 450円
商品3: 200円 × 1個 = 200円
合計: 1,250円
```

### 5.2. 商品検索優先順位テスト

**目的**: アプリケーションロジックでの商品検索順序の確認

**テストシナリオ**:

1. 同一商品コードで通常商品とローカル商品を作成
2. 通常商品マスタを優先して検索
3. 両方のデータが正しく区別されることを確認

### 5.3. 空の取引テスト

**目的**: 明細のない取引が正常に処理されることを確認

**検証項目**:

- 明細数が0である
- 取引自体は正常に保存される
- `total_price = 0`

---

## 6. テスト実行

### 6.1. 全テスト実行

```bash
cd LV3/backend
PYTHONPATH=. uv run pytest tests/ -v
```

### 6.2. 個別テスト実行

```bash
# 基本モデルテストのみ
PYTHONPATH=. uv run pytest tests/test_models.py -v

# 制約テストのみ
PYTHONPATH=. uv run pytest tests/test_constraints.py -v

# 特定のテストクラスのみ
PYTHONPATH=. uv run pytest tests/test_models.py::TestProductModel -v
```

### 6.3. カバレッジ測定

```bash
# カバレッジ測定付きでテスト実行
PYTHONPATH=. uv run pytest tests/ --cov=database --cov-report=html
```

---

## 7. テスト結果

### 7.1. 現在のテスト状況 (2025-10-08 更新)

- **総テスト数**: 27個
- **成功**: 27個 ✅
- **失敗**: 0個

外部キー制約は `conftest.py` の `PRAGMA foreign_keys=ON` により全テストで有効化され、`test_transaction_detail_foreign_key` も正常に制約違反を検出できています。

### 7.2. 追加メモ: カスケード削除

`Transaction` ← `TransactionDetail` 間に `ondelete=CASCADE` + SQLAlchemy リレーション `cascade="all, delete-orphan"` を設定しました。テスト `test_delete_transaction_with_details` で取引削除後に関連明細が残存しないことを確認しています。

---

## 8. 今後の拡張

### 8.1. APIテストとの統合

データベーステストで確立された基盤を活用し、FastAPIエンドポイントの統合テストを追加予定。

### 8.2. パフォーマンステスト

大量データでの検索・集計処理のパフォーマンステストを追加予定。

### 8.3. データマイグレーションテスト

スキーマ変更時のデータマイグレーション処理のテストを追加予定。

---

## 9. 参考資料

- [03_Database_Schema.md](../03_Database_Schema.md) - データベース設計書
- [02_API_Specification.md](../02_API_Specification.md) - API仕様書
- [pytest公式ドキュメント](https://docs.pytest.org/)
- [SQLAlchemy公式ドキュメント](https://docs.sqlalchemy.org/)

---

### 付録 A: 技術スタック更新メモ (2025-10-08)

| 項目 | 更新内容 | 備考 |
|:-----|:---------|:-----|
| Pydantic v2 移行 | 旧 `class Config` を廃止し `ConfigDict(from_attributes=True)` に統一 | 互換性維持・警告解消 |
| Alembic 導入 | `alembic.ini` / `migrations/` 初期化 & 初期リビジョン `0001_initial` | 今後は手動DDLではなくリビジョン管理 |
| カスケード削除 | `transactions` ↔ `transaction_details` に `ondelete=CASCADE` + ORM cascade | リレーションテスト追加済 |
