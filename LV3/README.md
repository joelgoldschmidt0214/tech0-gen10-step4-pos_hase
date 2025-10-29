# POS Application (LV3)

ポップアップストア向けのモダンなフルスタックPOSアプリケーションです。

## 概要

このプロジェクトは、店員が商品をスキャンし、購入リストを編集し、会計処理を行うまでの一連のフローをサポートするモバイルPOSアプリケーションです。バーコードスキャナー機能を搭載し、リアルタイムで商品情報を取得して購入リストに追加できます。

## 主な機能

- **バーコードスキャン**: カメラを使ったリアルタイムバーコード読み取り（ZXing Browser）
- **商品検索**: JANコードによる商品マスタ検索（通常マスタ→ローカル拡張マスタの順）
- **購入リスト管理**: 商品の追加、数量変更、削除
- **会計処理**: 税込価格を自動計算（表示・レスポンス用）。DBには税抜合計を保存して取引確定
- **トランザクション管理**: 取引ヘッダと明細の永続化、トランザクションコードの自動生成

## 技術スタック

### Frontend

- **Framework**: Next.js 15.5.4 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS 4
- **Barcode**: @zxing/browser
- **UI Components**: React Modal
- **Node.js**: 22.x (Volta管理)
- **Package Manager**: pnpm 10.x

### Backend

- **Framework**: FastAPI (Python 3.12)
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Migration**: Alembic
- **Database Driver**: PyMySQL (MySQL), SQLite3 (開発)

### Database

- **Production**: Azure Database for MySQL (SSL接続)
- **Development**: SQLite

### Deployment

- フロント: Azure App Service (Node.js)。環境変数 NEXT_PUBLIC_API_BASE_URL をバックエンドの公開URLに設定
- バックエンド: Azure App Service (Python)。DB接続文字列とSSL関連の環境変数を設定し、CORSでフロントのオリジンを許可
- マイグレーション: デプロイ時に Alembic `upgrade head` を実行
- **CI/CD**: GitHub Actions

## プロジェクト構造

```text
LV3/
├── frontend/          # Next.jsフロントエンド
│   ├── src/
│   │   ├── app/          # App Routerページ
│   │   ├── components/   # Reactコンポーネント
│   │   └── types/        # TypeScript型定義
│   ├── public/           # 静的ファイル
│   └── package.json
├── backend/           # FastAPIバックエンド
│   ├── app.py            # メインアプリケーション
│   ├── database.py       # モデル定義・DB設定
│   ├── create_db.py      # DB初期化スクリプト
│   ├── migrations/       # Alembicマイグレーション
│   └── pyproject.toml
└── public/
    └── docs/             # 設計ドキュメント
```

## API エンドポイント

### GET `/api/v1/products/{product_id}`

商品情報を取得します。商品マスタ、次にローカル拡張マスタの順に検索します（ローカル拡張は店舗コンテキスト store_id に基づき検索。store_id の受け渡し方法はAPI仕様書を参照）。

### POST `/api/v1/purchases`

購入処理を実行します。商品リストを受け取り税込金額を計算し、取引を確定します。DBには税抜合計と明細を保存し、レスポンスで税込合計や税額を返却します。

## データベーススキーマ

### products（商品マスタ）

- `product_id` (PK): JANコード
- `product_name`: 商品名
- `price`: 税抜価格
- `created_at`, `updated_at`: タイムスタンプ

### local_products（ローカル拡張マスタ）

- `product_id` (PK): JANコード
- `product_name`: 商品名
- `price`: 税抜価格
- `store_id`: 店舗ID
- `created_at`, `updated_at`: タイムスタンプ

### transactions（取引ヘッダ）

- `id` (PK): 自動採番ID
- `transaction_code`: 表示用トランザクションID（TRN-YYYYMMDD-####）
- `total_price`: 合計金額（税抜）
- `created_at`, `updated_at`: タイムスタンプ

### transaction_details（取引明細）

- `id` (PK): 自動採番ID
- `transaction_id` (FK): 取引ヘッダID
- `product_id`: 商品コード
- `product_name`: 商品名
- `unit_price`: 単価
- `quantity`: 数量

## 開発環境のセットアップ

### Backend

1. ディレクトリ移動とPython環境準備

    ```bash
    cd backend
    pyenv local 3.12
    uv venv
    source .venv/bin/activate  # Windowsの場合: .venv\Scripts\activate
    ```

2. 依存関係のインストール

    ```bash
    uv sync
    ```

3. 環境変数の設定

    ```bash
    cp .env.example .env
    # .envファイルを編集してDB_TYPE=sqliteを設定（開発時）
    ```

4. データベースの初期化

    ```bash
    python create_db.py --refresh
    ```

    本番運用では Alembic マイグレーションを適用してください:

    ```bash
    alembic upgrade head
    ```

5. 開発サーバーの起動

    ```bash
    uvicorn app:app --reload
    # http://localhost:8000 で起動
    ```

    CORSを有効化してフロントエンドのオリジンを許可してください（詳細は設定ファイル/.env参照）。

### Frontend

このリポジトリは pnpm ワークスペース（`pnpm-workspace.yaml`）で管理しています。LVごとにパッケージ化しており、LV3 フロントエンドのパッケージ名は `lv3-frontend` です。特にビルド時は必ずフィルタ指定を行ってください。

1. ディレクトリ移動とNode.js環境準備

    ```bash
    cd LV3/frontend
    volta pin node@22
    ```

2. 依存関係のインストール

    ```bash
    pnpm install
    ```

    環境変数の設定（APIエンドポイントの指定）

    ```bash
    # LV3/frontend/.env.local
    NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
    ```

3. 開発サーバーの起動

    ```bash
    cd LV3/frontend
    pnpm dev
    # http://localhost:3000 で起動
    ```

4. 本番ビルド

    ```bash
    # ビルドは必ずフィルタで対象パッケージを指定
    pnpm --filter lv3-frontend build
    pnpm --filter lv3-frontend start
    ```

## プロジェクトドキュメント

詳細な設計ドキュメントは`./public/docs/`に格納されています。

### 設計ドキュメント

- [**00_Project_Overview.md**](./public/docs/00_Project_Overview.md) - プロジェクト概要と開発環境
- [**01_Functional_Requirements.md**](./public/docs/01_Functional_Requirements.md) - 機能要件一覧
- [**02_API_Specification.md**](./public/docs/02_API_Specification.md) - API仕様書
- [**03_Database_Schema.md**](./public/docs/03_Database_Schema.md) - データベース設計書
- [**04_Customer_Value_Proposition.md**](./public/docs/04_Customer_Value_Proposition.md) - 顧客価値提案
- [**05_Secure_Azure_Architecture.md**](./public/docs/05_Secure_Azure_Architecture.md) - セキュアなAzure構成設計

### テストドキュメント

- [**00_Test_Plan_and_Report.md**](./public/docs/tests/00_Test_Plan_and_Report.md) - テスト計画書兼レポート
- [**01_Database_Test_Design.md**](./public/docs/tests/01_Database_Test_Design.md) - データベーステスト設計
- [**02_API_Test_Design.md**](./public/docs/tests/02_API_Test_Design.md) - APIテスト設計

---
