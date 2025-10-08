from datetime import datetime

import pytest
from database import LocalProduct, Product, Transaction, TransactionDetail


class TestProductModel:
  """商品マスタモデルのテスト"""

  def test_create_product(self, test_db_session):
    """商品の作成テスト"""
    # テストデータを作成
    product = Product(
      product_code="TEST001",
      name="テスト商品",
      price=100,
    )

    # データベースに保存
    test_db_session.add(product)
    test_db_session.commit()

    # 保存されたことを確認
    saved_product = test_db_session.query(Product).filter(Product.product_code == "TEST001").first()
    assert saved_product is not None
    assert saved_product.product_code == "TEST001"
    assert saved_product.name == "テスト商品"
    assert saved_product.price == 100
    assert saved_product.created_at is not None
    assert saved_product.updated_at is not None

  def test_product_code_unique_constraint(self, test_db_session):
    """商品コードのユニーク制約テスト"""
    # 最初の商品を作成
    product1 = Product(product_code="TEST001", name="テスト商品1", price=100)
    test_db_session.add(product1)
    test_db_session.commit()

    # 同じ商品コードで別の商品を作成
    product2 = Product(product_code="TEST001", name="テスト商品2", price=200)
    test_db_session.add(product2)

    # ユニーク制約違反でエラーが発生することを確認
    with pytest.raises(Exception):
      test_db_session.commit()

  def test_update_product(self, test_db_session):
    """商品の更新テスト"""
    # 商品を作成
    product = Product(product_code="TEST001", name="テスト商品", price=100)
    test_db_session.add(product)
    test_db_session.commit()

    # 商品を更新
    product.name = "更新されたテスト商品"
    product.price = 150
    test_db_session.commit()

    # 更新されたことを確認
    updated_product = test_db_session.query(Product).filter(Product.product_code == "TEST001").first()
    assert updated_product.name == "更新されたテスト商品"
    assert updated_product.price == 150

  def test_delete_product(self, test_db_session):
    """商品の削除テスト"""
    # 商品を作成
    product = Product(product_code="TEST001", name="テスト商品", price=100)
    test_db_session.add(product)
    test_db_session.commit()

    # 商品を削除
    test_db_session.delete(product)
    test_db_session.commit()

    # 削除されたことを確認
    deleted_product = test_db_session.query(Product).filter(Product.product_code == "TEST001").first()
    assert deleted_product is None


class TestLocalProductModel:
  """ローカル拡張マスタモデルのテスト"""

  def test_create_local_product(self, test_db_session):
    """ローカル商品の作成テスト"""
    local_product = LocalProduct(
      product_code="LOCAL001",
      name="ローカルテスト商品",
      price=200,
      store_id="store001",
    )

    test_db_session.add(local_product)
    test_db_session.commit()

    saved_product = test_db_session.query(LocalProduct).filter(LocalProduct.product_code == "LOCAL001").first()
    assert saved_product is not None
    assert saved_product.product_code == "LOCAL001"
    assert saved_product.name == "ローカルテスト商品"
    assert saved_product.price == 200
    assert saved_product.store_id == "store001"

  def test_local_product_default_store_id(self, test_db_session):
    """ローカル商品のデフォルト店舗IDテスト"""
    local_product = LocalProduct(
      product_code="LOCAL001",
      name="ローカルテスト商品",
      price=200,
    )

    test_db_session.add(local_product)
    test_db_session.commit()

    saved_product = test_db_session.query(LocalProduct).filter(LocalProduct.product_code == "LOCAL001").first()
    assert saved_product.store_id == "default_store"


class TestTransactionModel:
  """取引ヘッダモデルのテスト"""

  def test_create_transaction(self, test_db_session):
    """取引の作成テスト"""
    transaction = Transaction(
      transaction_code="TXN001",
      total_price=1500,
    )

    test_db_session.add(transaction)
    test_db_session.commit()

    saved_transaction = test_db_session.query(Transaction).filter(Transaction.transaction_code == "TXN001").first()
    assert saved_transaction is not None
    assert saved_transaction.transaction_code == "TXN001"
    assert saved_transaction.total_price == 1500
    assert saved_transaction.created_at is not None

  def test_create_transaction_without_code(self, test_db_session):
    """取引コードなしでの取引作成テスト"""
    transaction = Transaction(total_price=1000)

    test_db_session.add(transaction)
    test_db_session.commit()

    saved_transaction = test_db_session.query(Transaction).filter(Transaction.id == transaction.id).first()
    assert saved_transaction is not None
    assert saved_transaction.transaction_code is None
    assert saved_transaction.total_price == 1000


class TestTransactionDetailModel:
  """取引明細モデルのテスト"""

  def test_create_transaction_detail(self, test_db_session):
    """取引明細の作成テスト"""
    # まず取引ヘッダを作成
    transaction = Transaction(transaction_code="TXN001", total_price=1500)
    test_db_session.add(transaction)
    test_db_session.commit()

    # 取引明細を作成
    detail = TransactionDetail(
      transaction_id=transaction.id,
      product_code="TEST001",
      product_name="テスト商品",
      unit_price=500,
      quantity=3,
    )

    test_db_session.add(detail)
    test_db_session.commit()

    saved_detail = (
      test_db_session.query(TransactionDetail).filter(TransactionDetail.transaction_id == transaction.id).first()
    )
    assert saved_detail is not None
    assert saved_detail.transaction_id == transaction.id
    assert saved_detail.product_code == "TEST001"
    assert saved_detail.product_name == "テスト商品"
    assert saved_detail.unit_price == 500
    assert saved_detail.quantity == 3

  def test_transaction_detail_foreign_key(self, test_db_session):
    """取引明細の外部キー制約テスト"""
    # 存在しない取引IDで明細を作成しようとする
    detail = TransactionDetail(
      transaction_id=999,  # 存在しない取引ID
      product_code="TEST001",
      product_name="テスト商品",
      unit_price=500,
      quantity=1,
    )

    test_db_session.add(detail)

    # 外部キー制約違反でエラーが発生することを確認
    with pytest.raises(Exception):
      test_db_session.commit()


class TestTransactionWithDetails:
  """取引と明細の関連テスト"""

  def test_complete_transaction_flow(self, test_db_session):
    """完全な取引フローのテスト"""
    # 1. 取引ヘッダを作成
    transaction = Transaction(
      transaction_code="TXN001",
      total_price=1100,  # 500 * 1 + 300 * 2
    )
    test_db_session.add(transaction)
    test_db_session.commit()

    # 2. 取引明細を複数作成
    detail1 = TransactionDetail(
      transaction_id=transaction.id,
      product_code="PROD001",
      product_name="商品1",
      unit_price=500,
      quantity=1,
    )

    detail2 = TransactionDetail(
      transaction_id=transaction.id,
      product_code="PROD002",
      product_name="商品2",
      unit_price=300,
      quantity=2,
    )

    test_db_session.add_all([detail1, detail2])
    test_db_session.commit()

    # 3. 関連データの確認
    saved_transaction = test_db_session.query(Transaction).filter(Transaction.transaction_code == "TXN001").first()
    assert saved_transaction is not None

    details = (
      test_db_session.query(TransactionDetail).filter(TransactionDetail.transaction_id == saved_transaction.id).all()
    )
    assert len(details) == 2

    # 合計金額の計算確認
    calculated_total = sum(detail.unit_price * detail.quantity for detail in details)
    assert calculated_total == saved_transaction.total_price

  def test_delete_transaction_with_details(self, test_db_session):
    """取引削除時の明細の動作テスト"""
    # 取引と明細を作成
    # このテストでは外部キー制約無効を想定しているため一時的にOFFにする
    try:
      test_db_session.execute("PRAGMA foreign_keys=OFF")
    except Exception:  # pragma: no cover - SQLite以外では無視
      pass
    transaction = Transaction(transaction_code="TXN001", total_price=500)
    test_db_session.add(transaction)
    test_db_session.commit()

    detail = TransactionDetail(
      transaction_id=transaction.id,
      product_code="PROD001",
      product_name="商品1",
      unit_price=500,
      quantity=1,
    )
    test_db_session.add(detail)
    test_db_session.commit()

    # 外部キー制約がONのため、先に明細を削除してから取引を削除（カスケード削除の代替）
    test_db_session.query(TransactionDetail).filter(
      TransactionDetail.transaction_id == transaction.id,
    ).delete()
    test_db_session.delete(transaction)
    test_db_session.commit()

    # 取引が削除されたことを確認
    deleted_transaction = test_db_session.query(Transaction).filter(Transaction.transaction_code == "TXN001").first()
    assert deleted_transaction is None
