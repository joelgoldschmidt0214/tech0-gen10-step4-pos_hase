from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

# database.pyからモデル定義とDBセッション取得関数をインポート
import database
from database import get_db

# --- FastAPIアプリケーションの初期化 ---
app = FastAPI()

# --- CORS (Cross-Origin Resource Sharing) ミドルウェアの設定 ---
# フロントエンド(Next.js)が http://localhost:3000 から
# バックエンド(FastAPI)の http://localhost:8000 へアクセスするのを許可します。
# これがないと、ブラウザのセキュリティ機能によりAPIリクエストがブロックされます。
origins = [
    "http://localhost:3000",
    # ここに将来デプロイするフロントエンドのURLも追加する可能性があります
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # すべてのHTTPメソッドを許可
    allow_headers=["*"], # すべてのHTTPヘッダーを許可
)


# --- APIエンドポイントの定義 ---

# @app.get(...) は、この関数がHTTP GETリクエストを処理することを示します。
# "/api/v1/products/{product_code}" は、このAPIのURLパスです。
# {product_code} は、URLの一部として渡される動的な値（パスパラメータ）です。
# response_model=database.ProductSchema は、このAPIが返すJSONの形式を定義します。
@app.get("/api/v1/products/{product_code}", response_model=database.ProductSchema)
def get_product(product_code: str, db: Session = Depends(get_db)):
    """
    指定された商品コードに基づいて、商品を検索するAPI。
    まず商品マスタを検索し、見つからなければローカル拡張マスタを検索する。
    """
    print(f"商品コード検索: {product_code}") # 動作確認用のログ

    # 1. まずは通常の商品マスタ (productsテーブル) を検索
    product = db.query(database.Product).filter(database.Product.product_code == product_code).first()

    # 2. もし商品マスタに見つからなければ、ローカル拡張マスタ (local_productsテーブル) を検索
    if not product:
        product = db.query(database.LocalProduct).filter(database.LocalProduct.product_code == product_code).first()

    # 3. どちらのテーブルにも商品が見つからなかった場合
    if not product:
        # HTTP 404 Not Found エラーを返す
        raise HTTPException(status_code=404, detail="商品が見つかりません")

    # 4. 商品が見つかった場合は、その情報を返す
    # (FastAPIが自動でProductSchemaの形式に変換してJSONで返してくれます)
    return product