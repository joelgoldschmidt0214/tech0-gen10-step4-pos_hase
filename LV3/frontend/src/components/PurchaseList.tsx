// LV3/frontend/src/components/PurchaseList.tsx
import { PurchaseListItem } from "./PurchaseListItem";

// ★ このコンポーネントと外部で共有するデータの型をエクスポート
export type PurchaseItem = {
  id: number;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  discountText?: string;
};

export interface PurchaseListProps {
  items: PurchaseItem[];
  onItemSelect?: (item: PurchaseItem) => void; // 名前を変更
  onRemoveItem?: (productId: string) => void;
  onChangeQuantity?: (productId: string, newQuantity: number) => void;
}

export const PurchaseList = ({ items, onItemSelect }: PurchaseListProps) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg flex-grow overflow-y-auto">
      <h2 className="text-xl font-bold mb-2 text-gray-700">購入リスト</h2>
      {items.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">
          商品をスキャンしてください
        </p>
      ) : (
        <div>
          {/* 親から渡されたitemsをmapでループ処理 */}
          {items.map((item) => (
            // PurchaseListItemにitemオブジェクトをそのまま渡す
            <div key={item.product_id} className="flex items-center">
              <PurchaseListItem
                item={item} // ★ itemを丸ごと渡すように変更
              />
              <button
                onClick={() => onItemSelect && onItemSelect(item)} // 名前を変更
                className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                aria-label="数量変更"
              >
                ↑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
