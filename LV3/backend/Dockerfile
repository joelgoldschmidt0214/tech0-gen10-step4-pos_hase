# --- ベースステージ ---
FROM python:3.12-slim as base
WORKDIR /code
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
RUN pip install uv

# --- ビルダーステージ (依存関係のインストール) ---
FROM base as builder
COPY pyproject.toml .
# --systemでシステム全体にインストールし、後のステージにコピーする
RUN uv pip install --system --no-cache --from-requirements pyproject.toml

# --- 最終ステージ (実行環境) ---
FROM base as final
# ビルダーステージからインストール済みのパッケージをコピー
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
# アプリケーションコードをコピー
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]