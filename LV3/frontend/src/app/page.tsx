// LV3/frontend/src/app/page.tsx
"use client"; // ★ Stateを使うため、クライアントコンポーネント宣言を追加

import React, { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { Header } from "@/components/Header";
import { PurchaseList, PurchaseItem } from "@/components/PurchaseList";
import Modal from "react-modal";

// バックエンドのAPIのURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// トーストメッセージの型定義
interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error";
}

// PurchaseListのアクション型
type PurchaseListAction =
  | { type: 'ADD_OR_INCREMENT'; product: PurchaseItem }
  | { type: 'RESET' }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number };

// PurchaseListのReducer
function purchaseListReducer(state: PurchaseItem[], action: PurchaseListAction): PurchaseItem[] {
  switch (action.type) {
    case 'ADD_OR_INCREMENT': {
      const existingIndex = state.findIndex(item => item.product_id === action.product.product_id);
      if (existingIndex > -1) {
        const newState = [...state];
        newState[existingIndex] = {
          ...newState[existingIndex],
          quantity: newState[existingIndex].quantity + 1
        };
        return newState;
      } else {
        return [...state, { ...action.product, quantity: 1 }];
      }
    }
    case 'RESET':
      return [];
    case 'UPDATE_QUANTITY': {
      return state.map(item =>
        item.product_id === action.productId
          ? { ...item, quantity: action.quantity }
          : item
      );
    }
    default:
      return state;
  }
}

export default function PosPage() {
  // アプリケーションの状態を管理する
  const [purchaseList, dispatchPurchaseList] = useReducer(purchaseListReducer, []);
  const [totalPrice, setTotalPrice] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false); // モーダルの状態管理

  // 直近でスキャン/入力した商品の情報
  const [lastProduct, setLastProduct] = useState<PurchaseItem | null>(null);

  // 数量変更モーダルの状態
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [quantityInput, setQuantityInput] = useState(1);
  
  // handleScanが重複実行されるのを防ぐ
  const isProcessingRef = useRef(false);
  const lastProcessedCodeRef = useRef<string | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const pendingProductRef = useRef<{ code: string; name: string } | null>(null);

  // モーダルのアプリ要素を設定
  useEffect(() => {
    Modal.setAppElement("body"); // アプリ要素を設定
  }, []);

  // トーストメッセージを表示する関数
  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now() + Math.random(); // より確実にユニークなIDを生成
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    // 3秒後に自動削除
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // 合計金額を計算する関数
  const calculateTotalPrice = (list: PurchaseItem[]) => {
    return list.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // purchaseListが変更されたら合計金額を再計算
  useEffect(() => {
    setTotalPrice(calculateTotalPrice(purchaseList));
  }, [purchaseList]);

  // purchaseListが更新されたら、保留中の商品をlastProductに反映
  useEffect(() => {
    if (pendingProductRef.current) {
      const { code, name } = pendingProductRef.current;
      const updatedItem = purchaseList.find(item => item.product_id === code);
      if (updatedItem) {
        console.log('[useEffect] Updating lastProduct:', updatedItem);
        setLastProduct(updatedItem);
        setQuantityInput(updatedItem.quantity);
        
        const message = updatedItem.quantity > 1
          ? `${name} の数量を追加しました (${updatedItem.quantity}個)`
          : `${name} をリストに追加しました (1個)`;
        showToast(message, "success");
        
        pendingProductRef.current = null;
      }
    }
  }, [purchaseList]);

  // 商品追加（スキャン or 手動入力）
  const handleScan = useCallback(async (code: string) => {
    const now = Date.now();
    
    // 同じコードを200ms以内に処理しない（重複防止）
    if (lastProcessedCodeRef.current === code && 
        now - lastProcessedTimeRef.current < 200) {
      console.log('[handleScan] Duplicate request blocked:', code);
      return;
    }
    
    // 重複実行を防ぐ
    if (isProcessingRef.current) {
      console.log('[handleScan] Already processing, skipping...');
      return;
    }
    
    isProcessingRef.current = true;
    lastProcessedCodeRef.current = code;
    lastProcessedTimeRef.current = now;
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
      console.log('[handleScan] Product data:', productData);

      // 保留中の商品情報を保存
      pendingProductRef.current = {
        code: productData.product_id,
        name: productData.product_name
      };

      // Reducerを使って状態更新（useEffectで最新の状態が反映される）
      dispatchPurchaseList({ type: 'ADD_OR_INCREMENT', product: productData });
    } catch (error) {
      console.error("APIの呼び出しに失敗しました:", error);
      showToast("サーバーとの通信に失敗しました", "error");
    } finally {
      // 少し遅延させて次のリクエストを許可
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }
  }, []); // 依存配列を空にしてメモ化

  // リスト削除（全リセット）
  const handleRemoveAll = () => {
    dispatchPurchaseList({ type: 'RESET' });
    setLastProduct(null);
    setTotalPrice(0);
  };

  // 数量変更モーダル表示
  const handleChangeQuantityModal = () => {
    if (lastProduct) {
      setQuantityInput(lastProduct.quantity);
      setQuantityModalOpen(true);
    }
  };

  // 数量変更確定
  const handleQuantityConfirm = () => {
    if (!lastProduct) return;
    dispatchPurchaseList({
      type: 'UPDATE_QUANTITY',
      productId: lastProduct.product_id,
      quantity: quantityInput
    });
    setLastProduct({ ...lastProduct, quantity: quantityInput });
    setQuantityModalOpen(false);
  };

  // 購入処理
  const handlePurchase = async () => {
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
    dispatchPurchaseList({ type: 'RESET' }); // 購入リストをリセット
    setLastProduct(null);
    setTotalPrice(0); // 合計金額をリセット
  };

  // 購入リストの商品選択（↑ボタン用）
  const handleSelectItem = (item: PurchaseItem) => {
    setLastProduct({ ...item }); // product_id含む全情報を反映
    setQuantityInput(item.quantity);
  };

  // 税率
  const taxRate = 0.1;
  const totalPriceWithoutTax = Math.round(totalPrice / (1 + taxRate));
  const totalPriceWithTax = totalPrice;

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <Header
        onScan={handleScan}
        onMessage={showToast}
        lastProduct={lastProduct}
        onRemoveAll={handleRemoveAll}
        onChangeQuantityModal={handleChangeQuantityModal}
        purchaseListLength={purchaseList.length}
      />

      <main className="flex-1 p-4 overflow-y-auto flex flex-col items-center">
        {/* 購入リスト */}
        <div className="w-full mb-4">
          <PurchaseList
            items={purchaseList}
            onItemSelect={handleSelectItem} // 名前を変更
          />
        </div>
      </main>

      {/* 合計金額表示（フッターの左:ラベル、右:金額） */}
      <footer className="bg-white border-t border-gray-200 flex flex-col items-center">
        <div className="w-full p-4 space-y-4">
          <div className="flex items-center">
            <span className="text-gray-600 pr-5 text-lg">合計</span>
            <p className="flex-1 py-1 text-3xl font-bold text-gray-900 border text-center rounded-lg">
              {totalPrice.toLocaleString()}円
            </p>
          </div>
          <button
            className={`w-full py-4 text-white font-bold text-2xl rounded-lg transition ${
              purchaseList.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
            onClick={handlePurchase}
            disabled={purchaseList.length === 0}
          >
            購入
          </button>
        </div>
      </footer>

      {/* 購入確認モーダル */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={{
          content: {
            maxWidth: "350px",
            margin: "auto",
            padding: "2rem 1.5rem 1.5rem 1.5rem",
            borderRadius: "1rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            inset: "50% auto auto 50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          },
          overlay: {
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 1000,
          },
        }}
      >
        <h2 className="text-xl font-bold mb-4">購入確認</h2>
        <div className="mb-2 text-lg">
          <span className="text-gray-700">合計金額（税込）:</span>
          <span className="font-bold ml-2">
            ¥{totalPriceWithTax.toLocaleString()}
          </span>
        </div>
        <div className="mb-6 text-lg">
          <span className="text-gray-700">合計金額（税抜）:</span>
          <span className="font-bold ml-2">
            ¥{totalPriceWithoutTax.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-center">
          <button
            onClick={closeModal}
            className="w-full px-8 py-4 text-white bg-blue-600 rounded-lg text-xl font-bold shadow hover:bg-blue-700 transition"
          >
            OK
          </button>
        </div>
      </Modal>

      {/* 数量変更モーダル */}
      <Modal
        isOpen={quantityModalOpen}
        onRequestClose={() => setQuantityModalOpen(false)}
        style={{
          content: {
            maxWidth: "80%",
            margin: "auto",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            top: "350px", // Headerの高さ分下げる
            bottom: "50px", // 下端は10px
            textAlign: "center",
            display: "fixed",
            flexDirection: "column",
            justifyContent: "space-between", // ボタンを下端に
            // height: "calc(100vh - 130px - 10px)",
          },
          overlay: {
            backgroundColor: "rgba(0,0,0,0.2)",
            zIndex: 1000,
          },
        }}
      >
        <div>
          <h3 className="text-lg font-bold mb-2">数量変更</h3>
          <input
            type="number"
            min={1}
            value={quantityInput}
            onChange={(e) => setQuantityInput(Number(e.target.value))}
            className="w-full px-2 py-1 border rounded text-lg mb-4"
            inputMode="numeric"
          />
        </div>
        <button
          onClick={handleQuantityConfirm}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
        >
          決定
        </button>
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
              <span className="text-lg">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
