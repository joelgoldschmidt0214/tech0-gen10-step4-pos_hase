// LV3/frontend/src/components/PurchaseListItem.tsx

// PurchaseList.tsxで定義するPurchaseItem型をインポート
import type { PurchaseItem } from "./PurchaseList";

// 受け取るプロパティの型を PurchaseItem に変更
// これで、itemオブジェクトを丸ごと受け取れるようになる
type PurchaseListItemProps = {
  item: PurchaseItem;
};

export const PurchaseListItem = ({ item }: PurchaseListItemProps) => {
  // 割引を考慮しない単純な小計
  const subtotal = item.quantity * item.price;

  return (
    <div className="flex items-center w-full p-3 my-2 bg-white rounded-lg shadow-sm">
      <span className="flex-1 font-bold text-gray-800">
        {item.product_name}
      </span>
      <span className="w-16 text-right text-gray-800">{item.quantity}</span>
      <span className="w-20 text-right text-gray-800">
        {item.price.toLocaleString()}円
      </span>
      <span className="w-20 text-right font-semibold text-gray-900">
        {subtotal.toLocaleString()}円
      </span>

      {/* <button className="ml-4 p-2 text-2xl font-bold text-gray-400 hover:text-blue-500">
        ↑
      </button> */}
    </div>
  );
};
