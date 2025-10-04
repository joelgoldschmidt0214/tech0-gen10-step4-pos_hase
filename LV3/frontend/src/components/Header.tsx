// LV3/frontend/src/components/Header.tsx
import { ScanLine, Trash2, CheckCircle } from "lucide-react";
import React from "react";

// このコンポーネントが受け取るプロパティの型を定義
// 親コンポーネントから関数を受け取り、ボタンが押されたことを伝える
type HeaderProps = {
  onScan: (code: string) => void;
};

export const Header = ({ onScan }: HeaderProps) => {
  const [code, setCode] = React.useState("");

  const handleScanClick = () => {
    if (code) {
      onScan(code);
      setCode(""); // 入力フィールドをクリア
    }
  };

  // Enterキーでもスキャンを実行できるようにする
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScanClick();
    }
  };

  return (
    <header className="p-4 bg-white shadow-md">
      {/* 擬似的なスキャンボタン（実際はカメラを起動するが、今は手入力で代用） */}
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ここに商品コードを入力してスキャン"
          className="flex-grow p-2 border rounded-lg"
        />
        <button
          onClick={handleScanClick}
          className="flex items-center justify-center px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
        >
          <ScanLine size={20} className="mr-2" />
          スキャン
        </button>
      </div>

      {/* 今後のステップで実装する情報表示エリアとボタン */}
      <div className="mt-4 text-center text-gray-400">
        {/* （ここに選択商品の情報表示と削除・変更ボタンが入ります） */}
      </div>
    </header>
  );
};
