// LV3/frontend/src/app/page.tsx
import { PurchaseList } from "@/components/PurchaseList"; // @/ は src/ を指すエイリアスです

export default function PosPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {/* --- ヘッダーエリア --- */}
      <header className="p-4 bg-white shadow-md">
        {/* ここに後ほどスキャンボタンや情報表示エリアが入ります */}
        <h1 className="text-2xl font-bold text-center">POS App (LV3)</h1>
      </header>

      {/* --- メインコンテンツエリア (購入リスト) --- */}
      <main className="flex-1 p-4 overflow-y-auto">
        <PurchaseList />
      </main>

      {/* --- フッターエリア --- */}
      <footer className="flex items-center justify-between p-4 bg-white border-t border-gray-200">
        <div className="text-left">
          <span className="text-gray-600">合計:</span>
          <p className="text-3xl font-bold text-gray-900">¥1,850</p>
        </div>
        <button className="px-10 py-4 text-white bg-blue-500 rounded-lg hover:bg-blue-600 font-bold text-lg">
          購入
        </button>
      </footer>
    </div>
  );
}
