// LV3/frontend/src/app/page.tsx
"use client"; // ★ Stateを使うため、クライアントコンポーネント宣言を追加

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { PurchaseList, PurchaseItem } from "@/components/PurchaseList";
import Modal from "react-modal"; // モーダルライブラリをインポート

// バックエンドのAPIのURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// トーストメッセージの型定義
interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function PosPage() {
  // アプリケーションの状態を管理する
  const [purchaseList, setPurchaseList] = useState<PurchaseItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [toastId, setToastId] = useState(0);
  const [modalIsOpen, setModalIsOpen] = useState(false); // モーダルの状態管理

  // モーダルのアプリ要素を設定
  useEffect(() => {
    Modal.setAppElement("body"); // アプリ要素を設定
  }, []);

  // トーストメッセージを表示する関数
  const showToast = (message: string, type: "success" | "error") => {
    const id = toastId + 1;
    setToastId(id);
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    // 3秒後に自動削除
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // スキャンボタンが押されたときに実行される関数
  const handleScan = async (code: string) => {
    console.log(`商品検索: ${code}`); // デバッグ用ログ
    try {
      // バックエンドのAPIを呼び出す (JANコードをproduct_idとして使用)
      const response = await fetch(`${API_BASE_URL}/api/v1/products/${code}`);

      // 商品が見つからなかった場合 (404エラー)
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`商品検索エラー: ${errorData.detail}`);
        showToast(`エラー: ${errorData.detail}`, "error");
        return;
      }

      // 成功した場合、レスポンスのJSONを商品データに変換
      const productData = await response.json();

      // --- 購入リストへの追加ロジック ---
      // すでにリストに同じ商品があるか探す
      const existingItemIndex = purchaseList.findIndex(
        (item) => item.product_id === productData.product_id
      );

      let newList;
      let message: string;
      if (existingItemIndex > -1) {
        // あった場合：数量を+1する
        newList = [...purchaseList];
        newList[existingItemIndex].quantity += 1;
        message = `${productData.product_name} の数量を追加しました`;
      } else {
        // なかった場合：新しい商品としてリストに追加する
        const newItem: PurchaseItem = {
          ...productData,
          quantity: 1,
        };
        newList = [...purchaseList, newItem];
        message = `${productData.product_name} をリストに追加しました`;
      }

      setPurchaseList(newList);
      showToast(message, "success");
      // 合計金額を再計算（今後のステップで実装）
    } catch (error) {
      console.error("APIの呼び出しに失敗しました:", error);
      showToast("サーバーとの通信に失敗しました", "error");
    }
  };

  // 購入ボタンが押されたときに実行される関数
  const handlePurchase = async () => {
    const total = purchaseList.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotalPrice(total);
    setModalIsOpen(true); // モーダルを表示

    // 取引内容を記録するAPI呼び出し
    try {
      await fetch(`${API_BASE_URL}/api/v1/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: purchaseList.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
        }),
      });
    } catch (error) {
      console.error("取引記録の保存に失敗しました:", error);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false); // モーダルを閉じる
    showToast("取引が成立しました", "success"); // トーストメッセージを表示
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <Header onScan={handleScan} onMessage={showToast} />

      <main className="flex-1 p-4 overflow-y-auto">
        {/* 状態(purchaseList)をコンポーネントに渡す */}
        <PurchaseList items={purchaseList} />
      </main>

      <footer className="flex items-center justify-between p-4 bg-white border-t border-gray-200">
        <div className="text-left">
          <span className="text-gray-600">合計:</span>
          <p className="text-3xl font-bold text-gray-900">¥{totalPrice}</p>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-10 py-4 text-white bg-blue-500 rounded-lg hover:bg-blue-600 font-bold text-lg"
            onClick={handlePurchase} // クリックイベントハンドラーを追加
          >
            購入
          </button>
        </div>
      </footer>

      {/* モーダル表示 */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal}>
        <h2>購入確認</h2>
        <p>合計金額: ¥{totalPrice}</p>
        <button onClick={closeModal}>OK</button>
      </Modal>

      {/* トーストメッセージ表示 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            } animate-in slide-in-from-right`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {toast.type === "success" ? "✓" : "⚠️"}
              </span>
              <span className="text-sm">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
