# POSアプリケーション (LV3) 機能要件定義書

このドキュメントは、ポップアップストアの店員が使用するPOSアプリケーションの機能要件を定義します。

**最終更新日**: 2025-10-29

---

## 開発環境

### バックエンド

- **言語**: Python 3.12
- **フレームワーク**: FastAPI
- **ORM**: SQLAlchemy
- **マイグレーション**: Alembic
- **パッケージ管理**: uv
- **Python環境管理**: pyenv
- **データベース**: SQLite (開発) / Azure Database for MySQL (本番)

### フロントエンド

- **言語**: TypeScript
- **フレームワーク**: Next.js 15.5.4 (App Router)
- **UIライブラリ**: React 19
- **スタイリング**: Tailwind CSS 4
- **Node.js管理**: Volta (22.x)
- **パッケージ管理**: pnpm 10.x
- **ワークスペース**: pnpm workspace (`pnpm-workspace.yaml`)

### 実装詳細

- **バーコードライブラリ**: @zxing/browser, @undecaf/zbar-wasm
- **UIコンポーネント**: react-modal
- **データベースドライバ**: PyMySQL (MySQL), SQLite3 (開発)
- **バリデーション**: Pydantic
- **環境変数管理**: python-dotenv

---

## プロジェクト構成

```text
LV3/
├── frontend/          # Next.jsフロントエンド
│   ├── src/
│   │   ├── app/          # App Routerページ
│   │   ├── components/   # Reactコンポーネント
│   │   │   ├── BarcodeScanner.tsx
│   │   │   ├── BarcodeScannerZxing.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── PurchaseList.tsx
│   │   │   └── PurchaseListItem.tsx
│   │   └── types/        # TypeScript型定義
│   ├── public/           # 静的ファイル
│   ├── package.json
│   └── .env.local        # 環境変数
├── backend/           # FastAPIバックエンド
│   ├── app.py            # メインアプリケーション
│   ├── database.py       # モデル定義・DB設定
│   ├── create_db.py      # DB初期化スクリプト
│   ├── migrations/       # Alembicマイグレーション
│   │   └── versions/
│   │       ├── 0001_initial_schema.py
│   │       └── 8bfbd45359dd_products_local_products_jan主キー化.py
│   ├── tests/            # テストコード
│   │   ├── test_api_products.py
│   │   ├── test_api_purchases.py
│   │   ├── test_constraints.py
│   │   └── test_models.py
│   ├── pyproject.toml
│   ├── .env              # 環境変数
│   ├── .venv/            # Python仮想環境 (uv venv)
│   └── DigiCertGlobalRootG2.crt.pem  # MySQL SSL証明書
└── public/
    └── docs/             # 設計ドキュメント
        ├── 00_Project_Overview.md
        ├── 01_Functional_Requirements.md
        ├── 02_API_Specification.md
        ├── 03_Database_Schema.md
        ├── 04_Customer_Value_Proposition.md
        └── 05_Secure_Azure_Architecture.md
```

---

## 1. 商品スキャンとリスト追加機能

- **US-101 (商品スキャン):**
  - **役割:** 店員として
  - **目的:** スマートフォンのカメラで商品のバーコードをスキャンし、**購入リストに数量1で商品を追加したい**
  - **理由:** 手入力の手間を省き、迅速かつ正確に会計を開始するため

- **US-102 (手動コード入力):**
  - **役割:** 店員として
  - **目的:** バーコードが読み取れない場合に、**商品コードを手動で入力して購入リストに商品を追加したい**
  - **理由:** スキャンできない状況でも会計を継続できるようにするため

- **US-103 (同一商品の追加):**
  - **役割:** 店員として
  - **目的:** すでに購入リストにある商品を再度スキャンまたは入力した場合、**新しい行を追加するのではなく、既存の商品の数量を+1したい**
  - **理由:** 購入リストをコンパクトに保ち、見やすくするため

- **US-104 (未登録商品のハンドリング):**
  - **役割:** 店員として
  - **目的:** どの商品マスタにも登録されていないコードをスキャンまたは入力した場合、**エラーメッセージを表示し、リストには追加しないようにしたい**
  - **理由:** 不正なデータでの会計を防ぐため

## 2. 購入リストの編集機能

- **US-201 (商品の選択):**
  - **役割:** 店員として
  - **目的:** 購入リスト内の一つの商品をタップ（クリック）して **「選択状態」にしたい**
  - **理由:** 数量変更や削除の対象を明確にするため

- **US-202 (数量の変更):**
  - **役割:** 店員として
  - **目的:** 「選択状態」の商品の**数量を、専用の入力エリアで変更できるようにしたい**
  - **理由:** 顧客が同じ商品を複数購入する場合や、入力ミスを修正する場合に対応するため

- **US-203 (商品の削除):**
  - **役割:** 店員として
  - **目的:** 「選択状態」の**商品をリストから削除したい**
  - **理由:** 顧客が商品の購入を取りやめた場合に対応するため

## 3. 会計機能

- **US-301 (合計金額の表示):**
  - **役割:** 店員として
  - **目的:** 購入リストの内容が変更されるたびに、**画面下部の合計金額がリアルタイムで再計算され、表示されるようにしたい**
  - **理由:** 会計の合計額を常に把握できるようにするため

- **US-302 (購入の確定):**
  - **役割:** 店員として
  - **目的:** 「購入」ボタンを押して、**現在の購入リストの内容をサーバーに送信し、取引を確定させたい**
  - **理由:** 売上データを記録し、会計を完了させるため
  - **備考:** 取引確定時、税額は合計額に10%を適用し四捨五入相当で算出（実装: `floor(total*0.1 + 0.5)`）する。確定後、`TRN-YYYYMMDD-####`形式の取引コードを生成し、ヘッダに永続化する。

- **US-303 (会計完了の確認):**
  - **役割:** 店員として
  - **目的:** 購入が正常に完了した後、**合計金額（税込・税抜）が記載された確認ポップアップを表示させたい**
  - **理由:** 会計が正しく完了したことを確認し、画面をリセットするため
  - **備考:** レスポンスには `transaction_id` と同一フォーマットの `transaction_code` が含まれる。

---

## 4. 商品検索仕様（補足）

- 検索順序: 「通常マスタ（products）」→「ローカル拡張マスタ（local_products）」の順で検索する。
- 未登録商品: どちらにも存在しない場合はエラー（404）とし、購入リストに追加しない。
- 価格・名称: レスポンスは `product_id`, `product_name`, `price` を返す（価格は税抜）。

---

## 関連ドキュメント

- [00_Project_Overview.md](./00_Project_Overview.md) - プロジェクト概要と開発環境
- [02_API_Specification.md](./02_API_Specification.md) - API仕様書
- [03_Database_Schema.md](./03_Database_Schema.md) - データベース設計書
- [04_Customer_Value_Proposition.md](./04_Customer_Value_Proposition.md) - 顧客価値提案
- [05_Secure_Azure_Architecture.md](./05_Secure_Azure_Architecture.md) - セキュアなAzure構成設計

---
