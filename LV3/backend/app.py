# database.pyからモデル定義とDBセッション取得関数をインポート
from datetime import datetime
from math import floor

import database
from database import (
  PurchaseRequest,
  PurchaseResponse,
  Transaction,
  TransactionDetail,
  get_db,
)
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session  # noqa: TC002

# --- FastAPIアプリケーションの初期化 ---
app = FastAPI()

# --- CORS (Cross-Origin Resource Sharing) ミドルウェアの設定 ---
# フロントエンド(Next.js)が http://localhost:3000 から
# バックエンド(FastAPI)の http://localhost:8000 へアクセスするのを許可します。
# これがないと、ブラウザのセキュリティ機能によりAPIリクエストがブロックされます。
origins = [
  "http://localhost:3000",  # 開発用
  "https://app-002-gen10-step3-1-node-oshima5.azurewebsites.net",  # 本番用
]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],  # すべてのHTTPメソッドを許可
  allow_headers=["*"],  # すべてのHTTPヘッダーを許可
)


# --- APIエンドポイントの定義 ---


# @app.get(...) は、この関数がHTTP GETリクエストを処理することを示します。
# "/api/v1/products/{product_id}" は、このAPIのURLパスです。
# {product_id} は、URLの一部として渡される動的な値（パスパラメータ）です。
# response_model=database.ProductSchema は、このAPIが返すJSONの形式を定義します。
@app.get("/api/v1/products/{product_id}", response_model=database.ProductSchema)
def get_product(product_id: str, db: Session = Depends(get_db)):  # noqa: B008, FAST002
  """
  指定された商品コードに基づいて、商品を検索するAPI。
  まず商品マスタを検索し、見つからなければローカル拡張マスタを検索する。
  """
  print(f"商品コード検索: {product_id}")  # 動作確認用のログ

  # 1. まずは通常の商品マスタ (productsテーブル) を検索
  product = db.query(database.Product).filter(database.Product.product_id == product_id).first()

  # 2. もし商品マスタに見つからなければ、ローカル拡張マスタ (local_productsテーブル) を検索
  if not product:
    product = db.query(database.LocalProduct).filter(database.LocalProduct.product_id == product_id).first()

  # 3. どちらのテーブルにも商品が見つからなかった場合
  if not product:
    # HTTP 404 Not Found エラーを返す
    raise HTTPException(status_code=404, detail="商品が見つかりません")

  # 4. 商品が見つかった場合は、その情報を返す
  # (FastAPIが自動でProductSchemaの形式に変換してJSONで返してくれます)
  return product


@app.post("/api/v1/purchases", response_model=PurchaseResponse)
def create_purchase(payload: PurchaseRequest, db: Session = Depends(get_db)):  # noqa: B008, FAST002
  """購入処理API: 商品コードと数量のリストを受け取り取引を確定する。"""
  tax_rate = 0.10
  if not payload.items:
    raise HTTPException(status_code=400, detail="リクエストが無効です。itemsが空です。")

  total_without_tax = 0
  details: list[TransactionDetail] = []

  for item in payload.items:
    if item.quantity <= 0:
      raise HTTPException(status_code=400, detail=f"リクエストが無効です。数量が不正: {item.quantity}")

    # 商品検索 (通常→ローカル)
    product = (db.query(database.Product).filter(database.Product.product_id == item.product_id).first()) or (
      db.query(database.LocalProduct).filter(database.LocalProduct.product_id == item.product_id).first()
    )

    if not product:
      raise HTTPException(
        status_code=400,
        detail=f"リクエストが無効です。商品コード '{item.product_id}' は存在しません。",
      )

    line_total = product.price * item.quantity
    total_without_tax += line_total
    details.append(
      TransactionDetail(
        product_id=product.product_id,
        product_name=product.product_name,
        unit_price=product.price,
        quantity=item.quantity,
      ),
    )

  # 取引ヘッダ保存
  transaction = Transaction(total_price=total_without_tax, transaction_code=None)
  db.add(transaction)
  db.flush()  # transaction.id を取得

  # 明細にtransaction_id設定
  for d in details:
    d.transaction_id = transaction.id
    db.add(d)

  db.commit()

  # レスポンス用計算
  tax_amount = floor(total_without_tax * tax_rate + 0.5)
  total_with_tax = total_without_tax + tax_amount

  # 簡易トランザクションID生成 & 永続化
  display_transaction_id = f"TRN-{datetime.now().astimezone().strftime('%Y%m%d')}-{str(transaction.id).zfill(4)}"
  transaction.transaction_code = display_transaction_id
  db.add(transaction)
  db.commit()
  db.refresh(transaction)

  return PurchaseResponse(
    transaction_id=display_transaction_id,
    total_price_without_tax=total_without_tax,
    total_price_with_tax=total_with_tax,
    tax_rate=tax_rate,
    items_count=len(details),
    transaction_code=transaction.transaction_code,
  )
