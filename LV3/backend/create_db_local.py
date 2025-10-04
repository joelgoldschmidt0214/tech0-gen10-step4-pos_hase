from sqlalchemy.orm import Session
# database.pyから必要なものをインポート
from database import engine, Base, SessionLocal, Product, LocalProduct

def setup_database():
    """
    データベースのテーブルを作成し、初期データを投入する関数
    """
    print("テーブルを作成しています...")
    # database.pyで定義したすべてのテーブルをデータベース内に作成
    Base.metadata.create_all(bind=engine)
    print("テーブル作成完了。")

    # データベースと通信するためのセッションを作成
    db: Session = SessionLocal()

    try:
        # --- 初期データの投入 ---
        # 重複投入を防ぐため、データがまだ存在しない場合のみ実行
        if db.query(Product).first() is None:
            print("商品マスタに初期データを投入しています...")
            products_to_create = [
                Product(product_code="4902102132158", name="コカ・コーラ 500ml", price=160),
                Product(product_code="4901330537311", name="ポテトチップス うすしお味", price=140),
                Product(product_code="4549131932306", name="シャープペンシル 2.0mm", price=100),
                Product(product_code="4902778041043", name="ジェットストリーム 3色ボールペン", price=400),
            ]
            db.add_all(products_to_create)
            print("商品マスタへのデータ投入完了。")

        if db.query(LocalProduct).first() is None:
            print("ローカル拡張マスタに初期データを投入しています...")
            local_products_to_create = [
                LocalProduct(product_code="local001", name="【店舗限定】オリジナルブレンドコーヒー豆", price=980),
                LocalProduct(product_code="local002", name="【地産】採れたてトマト(3個入り)", price=250),
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
    print("\nローカルデータベースのセットアップが完了しました。")
    print("同じディレクトリに 'local.db' ファイルが作成/更新されたことを確認してください。")