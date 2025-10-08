// LV3/frontend/src/app/page.tsx
"use client"; // ★ Stateを使うため、クライアントコンポーネント宣言を追加

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PurchaseList, PurchaseItem } from "@/components/PurchaseList";

// バックエンドのAPIのURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function PosPage() {
  // アプリケーションの状態を管理する
  const [purchaseList, setPurchaseList] = useState<PurchaseItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // スキャンボタンが押されたときに実行される関数
  const handleScan = async (code: string) => {
    try {
      // バックエンドのAPIを呼び出す
      const response = await fetch(`${API_BASE_URL}/api/v1/products/${code}`);

      // 商品が見つからなかった場合 (404エラー)
      if (!response.ok) {
        const errorData = await response.json();
        alert(`エラー: ${errorData.detail}`);
        return;
      }

      // 成功した場合、レスポンスのJSONを商品データに変換
      const productData = await response.json();

      // --- 購入リストへの追加ロジック ---
      // すでにリストに同じ商品があるか探す
      const existingItemIndex = purchaseList.findIndex(
        (item) => item.product_code === productData.product_code
      );

      let newList;
      if (existingItemIndex > -1) {
        // あった場合：数量を+1する
        newList = [...purchaseList];
        newList[existingItemIndex].quantity += 1;
      } else {
        // なかった場合：新しい商品としてリストに追加する
        const newItem: PurchaseItem = {
          ...productData,
          quantity: 1,
        };
        newList = [...purchaseList, newItem];
      }

      setPurchaseList(newList);
      // 合計金額を再計算（今後のステップで実装）
    } catch (error) {
      console.error("APIの呼び出しに失敗しました:", error);
      alert("サーバーとの通信に失敗しました。");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <Header onScan={handleScan} />

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
          <Link
            href="/barcode-test"
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium text-sm"
          >
            バーコードテスト
          </Link>
          <button className="px-10 py-4 text-white bg-blue-500 rounded-lg hover:bg-blue-600 font-bold text-lg">
            購入
          </button>
        </div>
      </footer>
    </div>
  );
}
