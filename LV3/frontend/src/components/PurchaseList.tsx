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
  onRemoveItem?: (productId: string) => void;
  onChangeQuantity?: (productId: string, newQuantity: number) => void;
}

export const PurchaseList = ({ items }: PurchaseListProps) => {
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
            <PurchaseListItem
              key={item.product_id}
              item={item} // ★ itemを丸ごと渡すように変更
            />
          ))}
        </div>
      )}
    </div>
  );
};
