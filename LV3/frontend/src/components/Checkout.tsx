import React, { useState } from "react";
import Modal from "react-modal"; // モーダルライブラリをインポート

const Checkout = () => {
  const [totalAmount, setTotalAmount] = useState(0);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const handlePurchase = () => {
    setModalIsOpen(true); // モーダルを表示
  };

  const closeModal = () => {
    setModalIsOpen(false); // モーダルを閉じる
  };

  const taxRate = 0.1; // 税率
  const totalAmountTaxExcluded = totalAmount / (1 + taxRate); // 税抜金額
  const totalAmountTaxIncluded = totalAmount; // 税込金額

  return (
    <div>
      <h2>合計金額: {totalAmount} 円</h2>
      <button onClick={handlePurchase}>購入</button>

      <Modal isOpen={modalIsOpen} onRequestClose={closeModal}>
        <h2>取引確認</h2>
        <p>合計金額（税込）: {totalAmountTaxIncluded} 円</p>
        <p>合計金額（税抜）: {totalAmountTaxExcluded.toFixed(0)} 円</p>
        <button
          onClick={() => {
            closeModal();
            alert("取引が成立しました。");
          }}
        >
          OK
        </button>
      </Modal>
    </div>
  );
};

export default Checkout;
