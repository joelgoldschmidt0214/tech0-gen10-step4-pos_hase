// LV3/frontend/src/components/PurchaseList.tsx
import { PurchaseListItem } from "./PurchaseListItem";

// テスト用の仮データ
const mockItems = [
  {
    id: 1,
    name: "ぺんてる シャープペン オレンズ",
    quantity: 1,
    unitPrice: 450,
  },
  {
    id: 2,
    name: "コクヨ キャンパスノート A罫 5冊パック",
    quantity: 2,
    unitPrice: 550,
    discountText: "セット割 ¥50引き",
  },
  {
    id: 3,
    name: "【店舗限定】オリジナルデザイン Campusノート",
    quantity: 1,
    unitPrice: 250,
  },
];

export const PurchaseList = () => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg flex-grow overflow-y-auto">
      <h2 className="text-xl font-bold mb-2 text-gray-700">購入リスト</h2>
      {mockItems.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">
          商品をスキャンしてください
        </p>
      ) : (
        <div>
          {mockItems.map((item) => (
            <PurchaseListItem
              key={item.id}
              name={item.name}
              quantity={item.quantity}
              unitPrice={item.unitPrice}
              discountText={item.discountText}
            />
          ))}
        </div>
      )}
    </div>
  );
};
