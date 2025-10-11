"use client";

import { useState } from "react";
import BarcodeScannerDiagnostics from "@/components/BarcodeScannerDiagnostics";
import BarcodeScannerZxing from "@/components/BarcodeScannerZxing";

export default function DiagnosticsPage() {
  const [activeTab, setActiveTab] = useState<"zbar" | "zxing">("zbar");

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          バーコードスキャナー比較診断
        </h1>

        <div className="flex justify-center mb-6 space-x-4">
          <button
            onClick={() => setActiveTab("zbar")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "zbar"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            zbar-wasm (現状)
          </button>
          <button
            onClick={() => setActiveTab("zxing")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "zxing"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ZXing (改善版)
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
          <h2 className="font-semibold mb-2">診断方法</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>各タブを開いて診断を開始します</li>
            <li>同じバーコードを複数回スキャンして成功率を確認します</li>
            <li>明るさ、コントラスト、シャープネスなどの指標を比較します</li>
            <li>スキャン時間とパフォーマンスを比較します</li>
            <li>異なる環境（照明、距離、角度）でテストします</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === "zbar" && <BarcodeScannerDiagnostics />}
          {activeTab === "zxing" && (
            <BarcodeScannerZxing enableDiagnostics={true} />
          )}
        </div>

        <div className="mt-8 max-w-4xl mx-auto bg-blue-50 border border-blue-300 rounded-lg p-4">
          <h2 className="font-semibold mb-2">期待される結果</h2>
          <div className="text-sm space-y-2">
            <div>
              <strong className="text-blue-700">zbar-wasm:</strong>
              <ul className="list-disc list-inside ml-4">
                <li>成功率: 低い（5%未満の可能性）</li>
                <li>特定の条件でのみ読み取り可能</li>
                <li>画像品質の指標が最適範囲外</li>
              </ul>
            </div>
            <div>
              <strong className="text-green-700">ZXing:</strong>
              <ul className="list-disc list-inside ml-4">
                <li>成功率: 高い（30%以上の可能性）</li>
                <li>様々な条件で読み取り可能</li>
                <li>より高解像度で処理</li>
                <li>最適化されたアルゴリズム</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
