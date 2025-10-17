# POSアプリケーション (LV3) APIテスト設計書

## 1. 概要

本ドキュメントは POSアプリケーション (LV3) の FastAPI ベース API（商品検索・購入処理）のテスト設計をまとめたものです。データベース単体テストで検証済みのモデル/制約を前提に、APIレイヤの I/O / バリデーション / 業務ロジック連携を確認します。

2025-10-08 更新: 購入APIに `transaction_code` が永続化されレスポンスへ追加されたため関連テスト観点を追記しました。
2025-10-17 更新: 商品取得APIのレスポンスキーを `product_name` に統一しました。診断API `/api/v1/products-with-local` を追記しました。

### 1.1. テスト対象

| 分類 | 対象API | メソッド | パス |
|:-----|:--------|:--------|:-----|
| 商品検索 | 単一商品取得 | GET | `/api/v1/products/{product_id}` |
| 購入処理 | 取引確定 | POST | `/api/v1/purchases` |
| 診断 | 連結商品一覧 | GET | `/api/v1/products-with-local` |

### 1.2. 非対象

- 永続接続DB（本番MySQL）接続差異の検証（今回はSQLiteインメモリ）
- 認証 / 認可（仕様外）
- 大量データ性能試験（将来拡張）

### 1.3. テスト環境

| 項目 | 内容 |
|:-----|:-----|
| フレームワーク | FastAPI  |
| テストフレームワーク | pytest |
| HTTPクライアント | `fastapi.testclient` (`httpx`) |
| DB | SQLite インメモリ + StaticPool |
| 実行コマンド | `PYTHONPATH=. uv run pytest tests/ -v` |

---

## 2. テストファイル構成

```text
LV3/backend/tests/
├── test_api_products.py    # 商品検索APIテスト
└── test_api_purchases.py   # 購入APIテスト
```

### 2.1 共通設計

- 依存性注入 `get_db` をテスト用インメモリDBへオーバーライド
- StaticPool を用い同一コネクションを維持しテーブル消失を防止
- 必要最小限のシードデータ投入を各テスト内またはヘルパ関数で実施

---

## 3. 商品検索APIテスト設計 (`GET /api/v1/products/{product_id}`)

### 3.1. テスト観点

| 観点 | 説明 |
|:-----|:-----|
| 正常取得 | 既存コードの商品情報が取得できる |
| 検索優先順位 | 通常商品とローカル商品が重複する場合、通常商品が優先される |
| 未存在 | 該当コードが存在しない場合 404 を返す |

### 3.2. テストケース一覧

| ID | シナリオ | 事前データ | 期待ステータス | 期待レスポンス要点 |
|:--|:----------|:-----------|:---------------|:--------------------|
| P-01 | 通常商品ヒット | products に1件 | 200 | product_id/product_name/price が登録値 |
| P-02 | 通常/ローカル重複 | 両テーブル同じコード | 200 | product_name は通常商品、price は通常商品の値 |
| P-03 | 未存在コード | なし | 404 | `{ "detail": "商品が見つかりません" }` |

### 3.3. エッジ検討（未実装テスト候補）

| 項目 | 内容 | 優先度 |
|:-----|:-----|:-------|
| 長大コード | 文字長上限境界値（50文字） | 低 |
| 全角/半角混在 | 正常受理 | 低 |
| SQL Injection風文字列 | 値として扱われ問題ない | 中 |

---

## 4. 購入APIテスト設計 (`POST /api/v1/purchases`)

### 4.1. バリデーション / ロジック観点

| 観点 | 説明 |
|:-----|:-----|
| 正常複数行 | 複数商品混在購入の合計・税計算 |
| 商品コード存在確認 | 存在しないコードで400エラー |
| 数量バリデーション | 0以下で400エラー |
| 空リスト | items空で400エラー |
| 通常+ローカル混在 | 問題なく合計に反映される |
| 税計算 | 四捨五入相当 (floor(x*tax + 0.5)) |
| 取引コード永続化 | 生成した `TRN-YYYYMMDD-XXXX` 形式のコードがDBへ保存・レスポンス一致 |

### 4.2. テストケース一覧

| ID | シナリオ | リクエスト例 (items) | 期待ステータス | 主検証項目 |
|:--|:----------|:----------------------|:---------------|:-----------|
| C-01 | 正常複数 | P001×2,P002×1,LP003×3 | 200 | 税抜=1250/税込=1375/items_count=3/`transaction_code` 形式と一致 |
| C-02 | 不存在商品 | NOPE×1 | 400 | detailに対象コード含む |
| C-03 | 数量0 | P001×0 | 400 | detailに数量が不正文言 |
| C-04 | 空配列 | [] | 400 | detail が items 空エラー |
| C-05 | 通常+ローカル | P001×1,LP003×1 | 200 | 両方加算される |

### 4.3. 計算仕様

| 項目 | 内容 |
|:-----|:-----|
| 税率 | 10% 固定 (0.10) |
| 税額丸め | `floor(total_without_tax * 0.10 + 0.5)` |
| トランザクションID/コード | `TRN-YYYYMMDD-ゼロパディングID` を生成し `transaction_code` としてDB永続化・レスポンス返却 |

### 4.4. エッジ / 今後の追加候補

| 項目 | 内容 | 優先度 |
|:-----|:-----|:------|
| 非整数数量 | Pydantic側で弾かれるか確認 | 中 |
| 非数値価格（DB異常） | モデル制約で発生しにくい | 低 |
| 税率変更 | 設定化し環境変数駆動 | 中 |
| 超大数数量 | オーバーフロー対策（int範囲） | 低 |

---

## 5. 実装済みテストとのマッピング

| テストファイル | 関数 | ケースID対応 |
|:---------------|:-----|:-------------|
| test_api_products.py | `test_get_product_success` | P-01 |
| test_api_products.py | `test_get_product_prefers_regular_over_local` | P-02 |
| test_api_products.py | `test_get_product_not_found` | P-03 |
| test_api_purchases.py | `test_purchase_success` | C-01 (transaction_code フォーマット・一致確認含む) |
| test_api_purchases.py | `test_purchase_nonexistent_product` | C-02 |
| test_api_purchases.py | `test_purchase_invalid_quantity` | C-03 |
| test_api_purchases.py | `test_purchase_empty_items` | C-04 |

(C-05 は今後追加余地あり)

---

## 6. 実行方法

```bash
cd LV3/backend
PYTHONPATH=. uv run pytest tests/test_api_products.py -v
PYTHONPATH=. uv run pytest tests/test_api_purchases.py -v
# 全体
PYTHONPATH=. uv run pytest tests/ -v
```

---

## 7. 改善提案

| 区分 | 提案 | 効果 |
|:-----|:-----|:-----|
| カバレッジ | `pytest-cov` 導入しAPI層の網羅性を可視化 | 漏れ防止 |
| 異常系強化 | 長さ上限/文字種境界テスト追加 | 安定性 |
| 負荷 | Locust/JMeterシナリオ準備 | 性能把握 |
| CI統合 | GitHub Actions で自動実行 | 品質継続 |

---

## 8. 参考

- [02_API_Specification.md](../02_API_Specification.md)
- [01_Database_Test_Design.md](./01_Database_Test_Design.md)
- FastAPI / SQLAlchemy / pytest 公式ドキュメント

---

### 付録 A: 技術スタック更新メモ (2025-10-08)

| 項目 | 更新内容 | テスト影響 |
|:-----|:---------|:-----------|
| Pydantic v2 移行 | `class Config` → `model_config = ConfigDict(from_attributes=True)` に変更 | 振る舞い差異なし (Deprecation 警告解消) |
| Alembic 導入 | `alembic.ini` と初期リビジョン `0001_initial` 追加 | 今後のスキーマ変更はマイグレーション経由で反映 |
