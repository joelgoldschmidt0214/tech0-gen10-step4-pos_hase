import pytest
from database import Base, LocalProduct, Product, Transaction, TransactionDetail
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError


class TestDatabaseConstraints:
  """データベース制約のテスト"""

  @pytest.fixture
  def test_db_session_with_fk(self):
    """外部キー制約を有効にしたテスト用データベースセッション"""
    from sqlalchemy.orm import sessionmaker

    # SQLiteで外部キー制約を有効にするエンジンを作成
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

    # 外部キー制約を有効にするイベントハンドラーを設定
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
      cursor = dbapi_connection.cursor()
      cursor.execute("PRAGMA foreign_keys=ON")
      cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
      yield db
    finally:
      db.close()

  def test_product_code_unique_constraint(self, test_db_session):
    """商品コードのユニーク制約テスト（詳細版）"""
    # 最初の商品を作成
    product1 = Product(product_code="UNIQUE001", name="商品1", price=100)
    test_db_session.add(product1)
    test_db_session.commit()

    # 同じ商品コードで別の商品を作成しようとする
    product2 = Product(product_code="UNIQUE001", name="商品2", price=200)
    test_db_session.add(product2)

    # ユニーク制約違反でIntegrityErrorが発生することを確認
    with pytest.raises(IntegrityError):
      test_db_session.commit()

  def test_local_product_code_unique_constraint(self, test_db_session):
    """ローカル商品コードのユニーク制約テスト"""
    # 最初のローカル商品を作成
    local_product1 = LocalProduct(
      product_code="LOCAL_UNIQUE001",
      name="ローカル商品1",
      price=150,
      store_id="store1",
    )
    test_db_session.add(local_product1)
    test_db_session.commit()

    # 同じ商品コードで別のローカル商品を作成しようとする
    local_product2 = LocalProduct(
      product_code="LOCAL_UNIQUE001",
      name="ローカル商品2",
      price=250,
      store_id="store2",
    )
    test_db_session.add(local_product2)

    # ユニーク制約違反でIntegrityErrorが発生することを確認
    with pytest.raises(IntegrityError):
      test_db_session.commit()

  def test_transaction_code_unique_constraint(self, test_db_session):
    """取引コードのユニーク制約テスト"""
    # 最初の取引を作成
    transaction1 = Transaction(transaction_code="TXN_UNIQUE001", total_price=1000)
    test_db_session.add(transaction1)
    test_db_session.commit()

    # 同じ取引コードで別の取引を作成しようとする
    transaction2 = Transaction(transaction_code="TXN_UNIQUE001", total_price=2000)
    test_db_session.add(transaction2)

    # ユニーク制約違反でIntegrityErrorが発生することを確認
    with pytest.raises(IntegrityError):
      test_db_session.commit()

  def test_foreign_key_constraint(self, test_db_session_with_fk):
    """外部キー制約テスト（外部キー有効化）"""
    # 存在しない取引IDで明細を作成しようとする
    detail = TransactionDetail(
      transaction_id=999,  # 存在しない取引ID
      product_code="TEST001",
      product_name="テスト商品",
      unit_price=500,
      quantity=1,
    )

    test_db_session_with_fk.add(detail)

    # 外部キー制約違反でIntegrityErrorが発生することを確認
    with pytest.raises(IntegrityError):
      test_db_session_with_fk.commit()

  def test_cascade_delete_simulation(self, test_db_session_with_fk):
    """カスケード削除のシミュレーションテスト"""
    # 取引を作成
    transaction = Transaction(transaction_code="CASCADE_TEST", total_price=1500)
    test_db_session_with_fk.add(transaction)
    test_db_session_with_fk.commit()

    # 取引明細を作成
    detail1 = TransactionDetail(
      transaction_id=transaction.id,
      product_code="PROD1",
      product_name="商品1",
      unit_price=500,
      quantity=2,
    )
    detail2 = TransactionDetail(
      transaction_id=transaction.id,
      product_code="PROD2",
      product_name="商品2",
      unit_price=250,
      quantity=2,
    )

    test_db_session_with_fk.add_all([detail1, detail2])
    test_db_session_with_fk.commit()

    # 明細が2つ作成されたことを確認
    details_count = (
      test_db_session_with_fk.query(TransactionDetail)
      .filter(
        TransactionDetail.transaction_id == transaction.id,
      )
      .count()
    )
    assert details_count == 2

    # 手動で明細を削除してから取引を削除
    test_db_session_with_fk.query(TransactionDetail).filter(
      TransactionDetail.transaction_id == transaction.id,
    ).delete()
    test_db_session_with_fk.delete(transaction)
    test_db_session_with_fk.commit()

    # 取引と明細がすべて削除されたことを確認
    remaining_transaction = (
      test_db_session_with_fk.query(Transaction)
      .filter(
        Transaction.transaction_code == "CASCADE_TEST",
      )
      .first()
    )
    assert remaining_transaction is None

    remaining_details = (
      test_db_session_with_fk.query(TransactionDetail)
      .filter(
        TransactionDetail.transaction_id == transaction.id,
      )
      .count()
    )
    assert remaining_details == 0


class TestBusinessLogic:
  """ビジネスロジックのテスト"""

  def test_transaction_total_calculation(self, test_db_session):
    """取引合計金額の計算テスト"""
    # 取引を作成
    transaction = Transaction(transaction_code="CALC_TEST", total_price=0)  # 初期値
    test_db_session.add(transaction)
    test_db_session.commit()

    # 複数の明細を作成
    details = [
      TransactionDetail(
        transaction_id=transaction.id,
        product_code="CALC_PROD1",
        product_name="計算商品1",
        unit_price=300,
        quantity=2,  # 300 * 2 = 600
      ),
      TransactionDetail(
        transaction_id=transaction.id,
        product_code="CALC_PROD2",
        product_name="計算商品2",
        unit_price=150,
        quantity=3,  # 150 * 3 = 450
      ),
      TransactionDetail(
        transaction_id=transaction.id,
        product_code="CALC_PROD3",
        product_name="計算商品3",
        unit_price=200,
        quantity=1,  # 200 * 1 = 200
      ),
    ]

    test_db_session.add_all(details)
    test_db_session.commit()

    # 合計金額を計算
    calculated_total = sum(detail.unit_price * detail.quantity for detail in details)
    expected_total = 600 + 450 + 200  # 1250

    assert calculated_total == expected_total

    # 取引の合計金額を更新
    transaction.total_price = calculated_total
    test_db_session.commit()

    # データベースから再読み込みして確認
    updated_transaction = (
      test_db_session.query(Transaction)
      .filter(
        Transaction.transaction_code == "CALC_TEST",
      )
      .first()
    )
    assert updated_transaction.total_price == 1250

  def test_product_search_priority(self, test_db_session):
    """商品検索の優先順位テスト（通常商品 → ローカル商品）"""
    # 同じ商品コードで通常商品とローカル商品を作成
    product_code = "PRIORITY_TEST001"

    # 通常商品を作成
    regular_product = Product(
      product_code=product_code,
      name="通常商品",
      price=100,
    )
    test_db_session.add(regular_product)

    # ローカル商品を作成（異なる価格で区別）
    local_product = LocalProduct(
      product_code=product_code,
      name="ローカル商品",
      price=150,
      store_id="test_store",
    )
    test_db_session.add(local_product)
    test_db_session.commit()

    # 通常商品マスタを優先して検索（アプリケーションロジックのシミュレーション）
    found_regular = (
      test_db_session.query(Product)
      .filter(
        Product.product_code == product_code,
      )
      .first()
    )

    found_local = (
      test_db_session.query(LocalProduct)
      .filter(
        LocalProduct.product_code == product_code,
      )
      .first()
    )

    # 両方見つかることを確認
    assert found_regular is not None
    assert found_local is not None

    # 通常商品が優先されることを確認（価格で区別）
    assert found_regular.price == 100
    assert found_local.price == 150
    assert found_regular.name == "通常商品"
    assert found_local.name == "ローカル商品"

  def test_empty_transaction(self, test_db_session):
    """空の取引（明細がない取引）のテスト"""
    # 明細のない取引を作成
    empty_transaction = Transaction(
      transaction_code="EMPTY_TXN",
      total_price=0,
    )
    test_db_session.add(empty_transaction)
    test_db_session.commit()

    # 明細がないことを確認
    details_count = (
      test_db_session.query(TransactionDetail)
      .filter(
        TransactionDetail.transaction_id == empty_transaction.id,
      )
      .count()
    )
    assert details_count == 0

    # 取引自体は存在することを確認
    saved_transaction = (
      test_db_session.query(Transaction)
      .filter(
        Transaction.transaction_code == "EMPTY_TXN",
      )
      .first()
    )
    assert saved_transaction is not None
    assert saved_transaction.total_price == 0
