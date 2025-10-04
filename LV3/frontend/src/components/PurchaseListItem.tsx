// LV3/frontend/src/components/PurchaseListItem.tsx

// このコンポーネントが受け取るデータ（プロパティ）の型を定義
type PurchaseListItemProps = {
  name: string;
  quantity: number;
  unitPrice: number;
  discountText?: string; // ? は、このプロパティが無くても良いことを示す
};

export const PurchaseListItem = ({
  name,
  quantity,
  unitPrice,
  discountText,
}: PurchaseListItemProps) => {
  const subtotal = quantity * unitPrice;

  return (
    <div className="flex items-center p-3 my-2 bg-white rounded-lg shadow-sm">
      <div className="flex-grow">
        <p className="font-bold text-gray-800">{name}</p>
        <div className="flex items-center text-sm text-gray-500">
          <span>{`x${quantity} @ ¥${unitPrice}`}</span>
          {discountText && (
            <span className="ml-2 px-2 py-0.5 text-xs text-green-700 bg-green-100 rounded-full">
              {discountText}
            </span>
          )}
        </div>
      </div>
      <p className="w-24 text-right font-semibold text-gray-900">{`¥${subtotal}`}</p>
      <button className="ml-4 p-2 text-gray-400 hover:text-blue-500">↑</button>
    </div>
  );
};
