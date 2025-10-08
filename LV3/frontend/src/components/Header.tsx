// LV3/frontend/src/components/Header.tsx
import { ScanLine, Trash2, CheckCircle, Camera } from "lucide-react";
import React, { useState } from "react";
import BarcodeScanner from "./BarcodeScanner";

// このコンポーネントが受け取るプロパティの型を定義
// 親コンポーネントから関数を受け取り、ボタンが押されたことを伝える
type HeaderProps = {
  onScan: (code: string) => void;
};

export const Header = ({ onScan }: HeaderProps) => {
  const [code, setCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const handleScanClick = () => {
    if (code.trim()) {
      onScan(code.trim());
      setCode(""); // 入力フィールドをクリア
    }
  };

  const handleCameraClick = () => {
    setShowScanner(true);
  };

  const handleBarcodeScan = (scannedCode: string) => {
    setCode(scannedCode);
    setShowScanner(false);
    // 自動で商品検索を実行
    onScan(scannedCode);
  };

  const handleScanError = (error: string) => {
    alert(error);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  // Enterキーでもスキャンを実行できるようにする
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScanClick();
    }
  };

  return (
    <header className="p-4 bg-white shadow-md">
      {/* スキャン（カメラ）ボタン */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleCameraClick}
          className="flex items-center justify-center px-6 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 font-medium"
        >
          <Camera size={20} className="mr-2" />
          スキャン（カメラ）
        </button>
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

      {/* バーコードスキャナーモーダル */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">バーコードスキャン</h2>
              <button
                onClick={handleCloseScanner}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <BarcodeScanner 
              onScan={handleBarcodeScan}
              onError={handleScanError}
              onClose={handleCloseScanner}
            />
          </div>
        </div>
      )}

      {/* 今後のステップで実装する情報表示エリアとボタン */}
      <div className="mt-4 text-center text-gray-400">
        {/* （ここに選択商品の情報表示と削除・変更ボタンが入ります） */}
      </div>
    </header>
  );
};
