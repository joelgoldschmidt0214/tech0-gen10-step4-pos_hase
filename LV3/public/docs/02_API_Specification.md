# POSアプリケーション (LV3) API仕様書

APIのベースURL: `/api/v1`

---

## 共通仕様（実装ベース）

- 通貨・金額
  - すべての金額は日本円（JPY）、整数（円単位）で扱う。
  - 商品の`price`は税抜き単価（円, int）。
- 税計算
  - `tax_rate`は少数（例: 0.10）。
  - 税額は取引合計（`total_price_without_tax`）に対して適用し、丸めは四捨五入相当（実装: `floor(total * rate + 0.5)`）。
  - `total_price_with_tax = total_price_without_tax + floor(total_price_without_tax * tax_rate + 0.5)`
- 文字コード/タイムゾーン
  - UTF-8、Asia/Tokyo。
- 冪等性（将来的な推奨）
  - 現状の実装では未対応。将来的に`Idempotency-Key`ヘッダ等の導入を検討。

---

## 1. 商品 (Products)

### 1.1. 商品情報の取得（通常マスタ優先 → ローカル拡張）

指定された商品コードに対応する商品情報を取得する。基幹マスタ、ローカル拡張マスタの順で検索を行う。

- **エンドポイント:** `/products/{product_id}`
- **メソッド:** `GET`
- **認証:** 不要

#### パスパラメータ

| 名前           | 型     | 説明                             |
| :------------- | :----- | :------------------------------- |
| `product_id` | string | 検索対象の商品コード (JANコード等) |

#### レスポンス (Success: 200 OK)

- 備考: `price`は税抜き単価（円, int）。スキーマは実装クラス `ProductSchema` に準拠。

```json
{
  "product_id": "4902506306037",
  "product_name": "ぺんてる シャープペン オレンズ 0.2mm",
  "price": 450
}
```

#### レスポンス (Error: 404 Not Found)

商品が見つからなかった場合に返却する。

- **Content-Type:** `application/json`
- **Body:**

```json
{
  "detail": "商品が見つかりません"
}
```

---

## 2. 取引 (Purchases)

### 2.1. 購入処理の実行

現在の購入リストをサーバーに送信し、取引を確定させる。

- **エンドポイント:** `/purchases`
- **メソッド:** `POST`
- **認証:** 不要

#### リクエストボディ

- バリデーション（追加）
  - `items`: 必須、1〜100件まで。
  - `product_id`: 必須、非空、最大64文字（英数字・ハイフン・アンダースコア推奨）。
  - `quantity`: 必須、整数、1〜9999。
  - 同一`product_id`が複数ある場合はサーバー側で数量を合算する。

```json
{
  "items": [
    {
      "product_id": "4902506306037",
      "quantity": 2
    },
    {
      "product_id": "local001",
      "quantity": 1
    }
  ]
}
```

| キー           | 型      | 説明                                                                     |
| :------------- | :------ | :----------------------------------------------------------------------- |
| `product_id` | string  | 購入された商品の商品コード                                               |
| `quantity`     | integer | 購入された数量                                                           |

#### レスポンス (Success: 200 OK)

- 備考:
  - `items_count`は「購入リストの行数（異なるproduct_idの数）」を表す。
  - 現実装では`transaction_code`を生成・永続化し、レスポンスの`transaction_id`と同一フォーマットで返す（例: `TRN-YYYYMMDD-####`）。

```json
{
  "transaction_id": "TRN-20251026-0001",
  "total_price_without_tax": 1150,
  "total_price_with_tax": 1265,
  "tax_rate": 0.10,
  "items_count": 2,
  "transaction_code": "TRN-20251026-0001"
}
```

---

### 補足: 診断用エンドポイント

#### GET `/products-with-local`

- 概要: 通常マスタ（products）とローカル拡張マスタ（local_products）を結合し、全商品を返す診断用API。
- 例レスポンス（抜粋）:

```json
{
  "products": [
    {
      "PRD_ID": "4902506306037",
      "PRD_NAME": "通常マスタの商品名",
      "PRD_PRICE": 450,
      "LOCAL_PRD_NAME": null,
      "DISPLAY_ORDER": null,
      "IS_LOCAL": false
    },
    {
      "PRD_ID": "LP003",
      "PRD_NAME": "ローカル拡張の商品名",
      "PRD_PRICE": 150,
      "LOCAL_PRD_NAME": "ローカル拡張の商品名",
      "DISPLAY_ORDER": null,
      "IS_LOCAL": true
    }
  ]
}
```

- メモ: 将来的に取引リソースを公開する場合、`201 Created`と`Location: /purchases/{transaction_id}`の返却を検討。

#### レスポンス (Error: 400 Bad Request)

リクエストボディの形式が不正な場合や、存在しない商品コードが含まれている場合に返却する。

- **Content-Type:** `application/json`
- **Body:**

```json
{
  "detail": "リクエストが無効です。商品コード 'xxxxxxxx' は存在しません。"
}
```

---

### このドキュメントのポイント

- **明確なエンドポイント:** `/products/{product_id}`や`/purchases`といった、RESTfulな設計に基づいた分かりやすいURLを定義しています。
- **リクエストとレスポンスの具体例:** `JSON`の具体例と、各キーの説明をテーブルで示すことで、フロントエンドとバックエンドが実装すべきデータ構造が一目瞭然になります。
- **成功と失敗のケース:** 正常系（200 OK）だけでなく、異常系（404, 400）のレスポンスも明確に定義しています。これにより、エラーハンドリングの実装が非常にスムーズになります。
