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
    <div className="flex items-center p-3 my-2 bg-white rounded-lg shadow-sm">
      <div className="flex-grow">
        <p className="font-bold text-gray-800">{item.name}</p>
        <div className="flex items-center text-sm text-gray-500">
          <span>{`x${item.quantity} @ ¥${item.price}`}</span>
          {item.discountText && (
            <span className="ml-2 px-2 py-0.5 text-xs text-green-700 bg-green-100 rounded-full">
              {item.discountText}
            </span>
          )}
        </div>
      </div>
      <p className="w-24 text-right font-semibold text-gray-900">{`¥${subtotal}`}</p>

      <button className="ml-4 p-2 text-2xl font-bold text-gray-400 hover:text-blue-500">
        ↑
      </button>
    </div>
  );
};
