# POS Application (LV3)

ポップアップストア向けのモダンなフルスタックPOSアプリケーションです。

## 概要

このプロジェクトは、店員操作を想定したモバイルPOSアプリケーションであり、LV3の実用レベルの機能を実装することを目的としています。
顧客が商品をスキャンし、リストを編集し、最終的に会計処理を行うまでの一連のフローをサポートします。

## 技術スタック

- **Frontend:** Next.js (TypeScript, App Router, Node.js 22.x), Tailwind CSS
- **Backend:** FastAPI (Python 3.12), SQLAlchemy, Pydantic
- **Database:** MySQL (Production), SQLite (Development)
- **Deployment:** Azure App Service (Frontend/Backend), Azure Database for MySQL
- **CI/CD:** GitHub Actions

## プロジェクトドキュメント

開発に着手する前に、以下の設計ドキュメントを確認してください。これらはプロジェクトの「正」となる情報源です。

- [**01_Functional_Requirements.md**](./public/docs/01_Functional_Requirements.md)
  - このアプリケーションが「何を」実現するのかを定義した機能要件一覧です。

- [**02_API_Specification.md**](./public/docs/02_API_Specification.md)
  - フロントエンドとバックエンド間の通信規約（契約）を定義したAPI仕様書です。

- [**03_Database_Schema.md**](./public/docs/03_Database_Schema.md)
  - データの永続化方法を定義したデータベース設計書です。

## 開発環境のセットアップ

### Backend (`/backend`)

1. `cd backend`
2. `pyenv local 3.12` でPythonバージョンを設定
3. `uv venv` で仮想環境を作成
4. `source .venv/bin/activate` で有効化
5. `uv sync` で依存関係をインストール
6. `cp .env.example .env` で環境変数ファイルを作成し、`DATABASE_URL`を設定
7. `python create_db_local.py --refresh` でローカルDBを初期化
8. `uvicorn app:app --reload` で開発サーバーを起動

### Frontend (`/frontend`)

1. `cd frontend`
2. `volta pin node@22` でツールバージョンを設定
3. `pnpm install` で依存関係をインストール
4. `pnpm dev` で開発サーバーを起動
5. `pnpm build` で本番ビルドを生成

---
