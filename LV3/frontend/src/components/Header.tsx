// LV3/frontend/src/components/Header.tsx
import { ScanLine } from "lucide-react";
import React, { useState } from "react";
import BarcodeScanner from "./BarcodeScanner";
import { PurchaseItem } from "./PurchaseList";

// このコンポーネントが受け取るプロパティの型を定義
type HeaderProps = {
  onScan: (code: string) => void;
  onMessage: (message: string, type: "success" | "error") => void;
  lastProduct?: PurchaseItem | null;
  onRemoveAll?: () => void;
  onChangeQuantityModal?: () => void;
  purchaseListLength?: number;
};

export const Header = ({
  onScan,
  onMessage,
  lastProduct,
  onRemoveAll,
  onChangeQuantityModal,
  purchaseListLength = 0,
}: HeaderProps) => {
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const handleScanClick = () => {
    if (code.trim()) {
      onScan(code.trim());
      setCode(""); // 入力フィールドをクリア
    }
  };

  const handleStartScanning = () => {
    setIsScanning(true);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
  };

  const handleBarcodeScan = (scannedCode: string) => {
    setCode(scannedCode);
    // 自動で商品検索を実行（連続スキャンのためスキャンは停止しない）
    onScan(scannedCode);
  };

  const handleScanError = (error: string) => {
    onMessage(error, "error");
  };

  // Enterキーでもスキャンを実行できるようにする
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScanClick();
    }
  };

  // 表示値
  const productName = lastProduct?.product_name ?? "";
  const productPrice =
    lastProduct?.price !== undefined ? lastProduct.price.toLocaleString() : "";
  const productQuantity = lastProduct?.quantity ?? "";

  return (
    <header className="p-4 bg-white shadow-md">
      {/* スキャンエリア - カメラ映像か開始ボタン */}
      <div className="mb-4">
        {!isScanning ? (
          <button
            onClick={handleStartScanning}
            className="w-full h-32 flex items-center justify-center text-white bg-blue-500 rounded-lg hover:bg-blue-600 font-medium text-lg border-2 border-dashed border-blue-300"
          >
            📷 スキャン（カメラ）開始
          </button>
        ) : (
          <div className="relative">
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onError={handleScanError}
              compact={true}
            />
            <button
              onClick={handleStopScanning}
              className="absolute top-2 right-2 px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600 text-sm"
            >
              停止
            </button>
          </div>
        )}
      </div>

      {/* コード表示・入力 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="商品コードを入力"
          className="flex-grow p-3 border rounded-lg text-center text-lg font-mono"
        />
        <button
          onClick={handleScanClick}
          disabled={!code.trim()}
          className="flex items-center justify-center px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <ScanLine size={20} className="mr-1" />
          検索
        </button>
      </div>

      {/* 名称表示 */}
      <div className="mb-2 w-full">
        <input
          type="text"
          value={productName}
          readOnly
          placeholder="名称"
          className="w-full p-3 border rounded-lg text-lg bg-gray-100"
        />
      </div>

      {/* 単価・数量表示（横並び） */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={productPrice}
          readOnly
          placeholder="単価"
          className="flex-1 p-3 border rounded-lg text-lg bg-gray-100 text-right"
        />
        <input
          type="text"
          value={productQuantity}
          readOnly
          placeholder="数量"
          className="flex-1 p-3 border rounded-lg text-lg bg-gray-100 text-right"
        />
      </div>

      {/* リスト削除・数量変更ボタン（横並び） */}
      <div className="flex gap-2">
        <button
          onClick={onRemoveAll}
          disabled={purchaseListLength === 0}
          className={`flex-1 px-4 py-2 rounded-lg font-bold ${
            purchaseListLength === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
        >
          リスト削除
        </button>
        <button
          onClick={onChangeQuantityModal}
          disabled={purchaseListLength === 0}
          className={`flex-1 px-4 py-2 rounded-lg font-bold ${
            purchaseListLength === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          数量変更
        </button>
      </div>
    </header>
  );
};
