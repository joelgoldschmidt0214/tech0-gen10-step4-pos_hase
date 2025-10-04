import sys
from sqlalchemy.orm import Session
# database.pyから必要なものをインポート
from database import engine, Base, SessionLocal, Product, LocalProduct

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
                Product(product_code="4902506306037", name="ぺんてる シャープペン オレンズ 0.2mm", price=450),
                Product(product_code="4901681143118", name="ゼブラ ジェルボールペン サラサクリップ 0.5mm 黒", price=100),
                Product(product_code="4902778041043", name="三菱鉛筆 3色ボールペン ジェットストリーム 0.5mm", price=400),
                Product(product_code="4901480072382", name="コクヨ キャンパスノート A罫 5冊パック", price=550),
                Product(product_code="4902668080649", name="ヒサゴ 見積書掛紙 A4タテ用", price=300),
            ]
            db.add_all(products_to_create)
            print("商品マスタへのデータ投入完了。")

        if db.query(LocalProduct).first() is None:
            print("ローカル拡張マスタに初期データを投入しています...")
            local_products_to_create = [
                LocalProduct(product_code="local001", name="【店舗限定】オリジナルデザイン Campusノート", price=250),
                LocalProduct(product_code="local002", name="【地産】奈良の吉野杉を使った鉛筆 (HB)", price=180),
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