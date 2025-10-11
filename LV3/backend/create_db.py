import sys

# database.pyから必要なものをインポート
from database import Base, LocalProduct, Product, SessionLocal, engine
from sqlalchemy.orm import Session


def setup_database():
  """
  データベースのテーブルを作成し、初期データを投入する関数
  """
  # --- --refresh オプションの処理 ---
  # コマンドライン引数に "--refresh" が含まれていれば、
  # 既存のテーブルをすべて削除する
  if "--refresh" in sys.argv:
    print("リフレッシュオプションが指定されました。データベースを再作成します...")
    Base.metadata.drop_all(bind=engine)
    print("既存のテーブルをすべて削除しました。")

  print("テーブルを作成しています...")
  # database.pyで定義したすべてのテーブルをデータベース内に作成
  Base.metadata.create_all(bind=engine)
  print("テーブル作成完了。")

  # データベースと通信するためのセッションを作成
  db: Session = SessionLocal()

  try:
    # --- 初期データの投入 (テーマ: 文具) ---
    # 重複投入を防ぐため、データがまだ存在しない場合のみ実行
    if db.query(Product).first() is None:
      print("商品マスタに初期データを投入しています...")
      products_to_create = [
        # Tombow消しゴム（修正済み）
        Product(product_id="4901991654011", product_name="MONO消しゴム", price=100),
        Product(product_id="4901991654028", product_name="MONO消しゴム 小", price=80),
        Product(product_id="4901991654035", product_name="MONO消しゴム ブラック", price=120),
        Product(product_id="4901991654042", product_name="MONO消しゴム 限定カラー", price=150),
        # Tombowボールペン・マーカー（修正済み）
        Product(product_id="4901991501018", product_name="ABTデュアルブラッシュペン 黒", price=350),
        Product(product_id="4901991501025", product_name="ABTデュアルブラッシュペン 赤", price=350),
        Product(product_id="4901991501032", product_name="ABTデュアルブラッシュペン 青", price=350),
        Product(product_id="4901991501049", product_name="ABTデュアルブラッシュペン 緑", price=350),
        Product(product_id="4901991501056", product_name="ABTデュアルブラッシュペン 黄", price=350),
        Product(product_id="4901991501063", product_name="ABTデュアルブラッシュペン ピンク", price=350),
        # Tombowシャープペン（修正済み）
        Product(product_id="4901991701012", product_name="MONOグラフ シャープペン 0.5mm", price=400),
        Product(product_id="4901991701029", product_name="MONOグラフ シャープペン 0.3mm", price=400),
        Product(product_id="4901991701036", product_name="MONOグラフ シャープペン 限定色", price=450),
        Product(product_id="4901991701043", product_name="ZOOM シャープペン 0.5mm", price=600),
        Product(product_id="4901991701050", product_name="ZOOM シャープペン 0.3mm", price=600),
        # Tombow修正テープ（修正済み）
        Product(product_id="4901991901016", product_name="MONO修正テープ 5mm", price=250),
        Product(product_id="4901991901023", product_name="MONO修正テープ 4.2mm", price=250),
        Product(product_id="4901991901030", product_name="MONO修正テープ 限定色", price=300),
        # Tombowのり（OK）
        Product(product_id="4901992001012", product_name="ピットのり スティックタイプ", price=180),
        Product(product_id="4901992001029", product_name="ピットのり 液体タイプ", price=200),
        Product(product_id="4901992001036", product_name="ピットのり 限定パッケージ", price=220),
      ]
      db.add_all(products_to_create)
      print("商品マスタへのデータ投入完了。")

    if db.query(LocalProduct).first() is None:
      print("ローカル拡張マスタに初期データを投入しています...")
      local_products_to_create = [
        LocalProduct(
          product_id="4901992201016",
          product_name="【店舗限定】ABTデュアルブラッシュペン ゴールド",
          price=400,
        ),
        LocalProduct(
          product_id="4901992201023",
          product_name="【店舗限定】MONOグラフ シャープペン 限定軸色",
          price=500,
        ),
        LocalProduct(product_id="4901992201030", product_name="【店舗限定】ピットのり 限定デザイン", price=250),
        LocalProduct(
          product_id="4901992201047",
          product_name="【店舗限定】ABTデュアルブラッシュペン 限定色セット",
          price=600,
        ),
        LocalProduct(product_id="4901992201061", product_name="【店舗限定】MONO修正テープ 限定柄", price=350),
        LocalProduct(
          product_id="4901992201078",
          product_name="【店舗限定】ABTデュアルブラッシュペン シルバー",
          price=400,
        ),
        LocalProduct(product_id="4901992201085", product_name="【店舗限定】MONO消しゴム 限定パッケージ", price=180),
        LocalProduct(product_id="4901992201092", product_name="【店舗限定】ZOOM シャープペン 限定軸色", price=650),
        LocalProduct(product_id="4901992201108", product_name="【店舗限定】ピットのり 限定香り付き", price=300),
        LocalProduct(product_id="4901992201115", product_name="【店舗限定】MONO消しゴム 限定デザイン", price=200),
      ]
      db.add_all(local_products_to_create)
      print("ローカル拡張マスタへのデータ投入完了。")

    # 変更をデータベースにコミット（保存）
    db.commit()

  finally:
    # セッションを閉じる
    db.close()


if __name__ == "__main__":
  setup_database()
  print("\nデータベースのセットアップが完了しました。")
  print("データベースが作成/更新されたことを確認してください。")
