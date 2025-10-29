# POSアプリケーション プロジェクト概要

**作成日**: 2025-10-29

**対象**: tech0-gen10-step4-pos_hase プロジェクト全体

---

## プロジェクト構成

このプロジェクトは段階的な学習を目的とした、レベル別のPOSアプリケーション実装です。

### ディレクトリ構造

```text
tech0-gen10-step4-pos_hase/
├── LV1/                    # レベル1 (計画のみ、未実装)
├── LV2/                    # レベル2 (計画のみ、未実装)
├── LV3/                    # レベル3 (現在の実装)
│   ├── frontend/           # Next.js フロントエンド
│   ├── backend/            # FastAPI バックエンド
│   └── public/docs/        # 設計ドキュメント
├── pnpm-workspace.yaml     # pnpmワークスペース設定
├── docker-compose.yml      # Docker開発環境
└── terraform/              # インフラストラクチャ as Code
```

### 現在の実装状況

- **LV3**: 完全実装済み
  - フロントエンド: Next.js 15.5.4 + React 19
  - バックエンド: FastAPI + SQLAlchemy
  - データベース: SQLite (開発) / Azure Database for MySQL (本番)

- **LV1, LV2**: 計画段階（未実装）

---

## 技術スタック

### フロントエンド共通仕様

- **パッケージマネージャー**: pnpm 10.x
- **Node.js管理**: Volta
- **ワークスペース管理**: `pnpm-workspace.yaml`

  ```yaml
  packages:
    - "LV?/frontend"
  ```

#### pnpm workspaceの利点

1. **マルチプロジェクト管理**: LV1, LV2, LV3の各フロントエンドを一元管理
2. **依存関係の共有**: 共通パッケージのディスク使用量削減
3. **効率的なビルド**: 個別にビルド可能

#### 使用方法

```bash
# すべてのワークスペースに依存関係をインストール
pnpm install

# 特定のワークスペースでコマンドを実行
pnpm --filter lv3-frontend dev
pnpm --filter lv3-frontend build

# すべてのワークスペースでコマンドを実行
pnpm -r dev
```

### バックエンド共通仕様

- **Python管理**: pyenv
- **パッケージマネージャー**: uv
- **仮想環境**: `.venv` (各バックエンドディレクトリ内)

#### pyenv + uvの利点

1. **Pythonバージョン管理**: プロジェクトごとに異なるPythonバージョンを使用可能
2. **高速な依存関係解決**: uvは従来のpipより高速
3. **仮想環境の統一**: `.venv`で環境を隔離

#### 使用方法

```bash
# プロジェクトディレクトリでPythonバージョンを指定
cd LV3/backend
pyenv local 3.12

# 仮想環境の作成と有効化
uv venv
source .venv/bin/activate  # Linux/macOS

# 依存関係のインストール
uv sync
```

---

## 開発環境のセットアップ

### 前提条件

以下のツールをインストールしてください:

- **pyenv**: Python環境管理
- **uv**: Pythonパッケージマネージャー
- **Volta**: Node.jsバージョン管理
- **pnpm**: JavaScriptパッケージマネージャー
- **Docker & Docker Compose**: コンテナ環境 (オプション)

### クイックスタート (LV3)

#### 1. フロントエンド

```bash
# プロジェクトルートで依存関係をインストール
pnpm install

# フロントエンド起動
cd LV3/frontend
pnpm dev
# http://localhost:3000 で起動
```

#### 2. バックエンド

```bash
# バックエンドディレクトリに移動
cd LV3/backend

# Python環境の準備
pyenv local 3.12
uv venv
source .venv/bin/activate

# 依存関係のインストール
uv sync

# 環境変数の設定
cp .env.example .env
# .envを編集: DB_TYPE="sqlite"

# データベースの初期化
python create_db.py --refresh

# 開発サーバー起動
uvicorn app:app --reload
# http://localhost:8000 で起動
```

#### 3. Docker Compose (オプション)

```bash
# プロジェクトルートで
docker-compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

---

## プロジェクト拡張の指針

### 新しいレベル (LV1, LV2) の追加

1. **ディレクトリ作成**

   ```bash
   mkdir -p LV1/frontend LV1/backend
   mkdir -p LV2/frontend LV2/backend
   ```

2. **フロントエンドの初期化**

   ```bash
   cd LV1/frontend
   volta pin node@22
   pnpm init
   # package.jsonでname: "lv1-frontend"を設定
   ```

3. **バックエンドの初期化**

   ```bash
   cd LV1/backend
   pyenv local 3.12
   uv venv
   source .venv/bin/activate
   uv init
   ```

4. **pnpm-workspace.yamlの確認**

   ```yaml
   packages:
     - "LV?/frontend"  # ワイルドカードで自動認識
   ```

---

## 環境変数管理

### バックエンド (.env)

各バックエンドディレクトリに `.env` ファイルを配置:

```bash
# LV3/backend/.env
DB_TYPE="sqlite"  # or "mysql"
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASSWORD=""
```

### フロントエンド (.env.local)

各フロントエンドディレクトリに `.env.local` ファイルを配置:

```bash
# LV3/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## デプロイ構成

### 開発環境

- **フロントエンド**: `pnpm dev` でローカル起動
- **バックエンド**: `uvicorn app:app --reload` でローカル起動
- **データベース**: SQLite (local.db)

### 本番環境 (Azure)

- **フロントエンド**: Azure App Service (Node.js)
- **バックエンド**: Azure App Service (Python)
- **データベース**: Azure Database for MySQL
- **CI/CD**: GitHub Actions
- **IaC**: Terraform (`terraform/` ディレクトリ)

詳細は [05_Secure_Azure_Architecture.md](./05_Secure_Azure_Architecture.md) を参照。

---

## 関連ドキュメント

- [01_Functional_Requirements.md](./01_Functional_Requirements.md) - 機能要件
- [02_API_Specification.md](./02_API_Specification.md) - API仕様
- [03_Database_Schema.md](./03_Database_Schema.md) - データベース設計
- [04_Customer_Value_Proposition.md](./04_Customer_Value_Proposition.md) - 顧客価値提案
- [05_Secure_Azure_Architecture.md](./05_Secure_Azure_Architecture.md) - Azure構成設計

---

## トラブルシューティング

### pyenvでPython 3.12が見つからない

```bash
# Python 3.12をインストール
pyenv install 3.12
pyenv local 3.12
```

### pnpmが認識されない

```bash
# pnpmをグローバルインストール
npm install -g pnpm

# または、Corepackを使用 (Node.js 16.9.0以降)
corepack enable
corepack prepare pnpm@latest --activate
```

### uvが認識されない

```bash
# uvをインストール
curl -LsSf https://astral.sh/uv/install.sh | sh

# または、pipを使用
pip install uv
```

### Voltaが認識されない

```bash
# Voltaをインストール (Linux/macOS)
curl https://get.volta.sh | bash

# Windows
# https://docs.volta.sh/guide/getting-started からインストーラーをダウンロード
```

---

## まとめ

このプロジェクトは、段階的な学習と拡張性を重視した構成になっています:

1. **pnpm workspace**: 複数のフロントエンドを効率的に管理
2. **pyenv + uv**: Pythonバージョンと依存関係を厳密に管理
3. **Volta**: Node.jsバージョンをプロジェクトごとに固定
4. **モジュール化**: LV1, LV2, LV3で段階的に機能追加が可能

LV3の実装を参考に、LV1やLV2を追加実装することで、学習効果を最大化できます。
