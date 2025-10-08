// LV3/frontend/src/components/Header.tsx
import { ScanLine } from "lucide-react";
import React, { useState } from "react";
import BarcodeScanner from "./BarcodeScanner";

// このコンポーネントが受け取るプロパティの型を定義
type HeaderProps = {
  onScan: (code: string) => void;
  onMessage: (message: string, type: "success" | "error") => void;
};

export const Header = ({ onScan, onMessage }: HeaderProps) => {
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

      {/* コード表示/入力エリア */}
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="12345678901"
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
    </header>
  );
};
