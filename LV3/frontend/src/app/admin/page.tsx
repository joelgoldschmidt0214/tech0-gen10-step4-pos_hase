"use client";

import { useEffect, useState } from "react";

interface Product {
  PRD_ID: string;
  PRD_NAME: string;
  PRD_PRICE: number;
  DISPLAY_ORDER: number | null;
  IS_LOCAL: boolean;
}

// バックエンドのAPIのURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/products-with-local`
      );
      if (!response.ok) {
        throw new Error("商品データの取得に失敗しました");
      }
      const data = await response.json();
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">エラー: {error}</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        商品一覧（管理画面）
        <span className="mt-4 text-gray-600 float-right text-xl">
          合計: {products.length} 件
        </span>
      </h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">商品ID</th>
              <th className="px-4 py-2 border">商品名</th>
              <th className="px-4 py-2 border">価格</th>
              <th className="px-4 py-2 border">種別</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={`${product.PRD_ID}-${index}`}
                className="hover:bg-gray-50"
              >
                <td className="px-4 py-2 border text-center">
                  {product.PRD_ID}
                </td>
                <td className="px-4 py-2 border">{product.PRD_NAME}</td>
                <td className="px-4 py-2 border text-right">
                  ¥{product.PRD_PRICE.toLocaleString()}
                </td>
                <td className="px-1 py-2 border text-center">
                  {product.IS_LOCAL ? (
                    <span className="px-1 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      ローカル
                    </span>
                  ) : (
                    <span className="px-1 py-1 bg-green-100 text-green-800 rounded text-sm">
                      通常
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
